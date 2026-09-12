// Supabase Edge Function: RevenueCat webhook receiver.
//
// RevenueCat is the source of truth for purchases. This function mirrors each
// event into `revenuecat_events`, `revenuecat_customers` and
// `subscription_entitlements`, then sets `app_users.user_plan` to `PRO` when
// the `premium` entitlement is active and back to `Free` when it is not.
//
// Deploy:   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets:  supabase secrets set REVENUECAT_WEBHOOK_SECRET=<long random string>
//           (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// Optional: supabase secrets set REVENUECAT_ALLOW_SANDBOX=true   (dev projects only)

import { createClient } from "npm:@supabase/supabase-js@2";

const PREMIUM_ENTITLEMENT_ID = "premium";

type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  store?: string;
  environment?: "SANDBOX" | "PRODUCTION";
  cancel_reason?: string;
  expiration_reason?: string;
  transferred_from?: string[];
  transferred_to?: string[];
};

type EntitlementStatus =
  | "active"
  | "trialing"
  | "grace_period"
  | "expired"
  | "cancelled"
  | "billing_issue"
  | "unknown";

const RECORD_ONLY_EVENTS = new Set(["TEST", "SUBSCRIBER_ALIAS", "SUBSCRIPTION_EXTENDED"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function toIso(ms: number | null | undefined) {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Clerk ids look like `user_…`; anonymous RevenueCat ids start with `$RCAnonymousID`. */
function findClerkUserId(event: RevenueCatEvent) {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return candidates.find((id) => typeof id === "string" && id.startsWith("user_")) ?? null;
}

function resolveStatus(event: RevenueCatEvent): EntitlementStatus {
  const expiresAt = toIso(event.expiration_at_ms);
  const isExpired = expiresAt ? Date.parse(expiresAt) <= Date.now() : false;

  switch (event.type) {
    case "EXPIRATION":
      return "expired";
    case "BILLING_ISSUE":
      return "billing_issue";
    case "CANCELLATION":
      // A refund revokes immediately (expiration in the past). A subscription
      // cancellation keeps access until the period ends.
      return isExpired ? "cancelled" : "active";
    case "INITIAL_PURCHASE":
    case "NON_RENEWING_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "TRANSFER":
      if (isExpired) {
        return "expired";
      }

      return event.period_type === "TRIAL" ? "trialing" : "active";
    default:
      return isExpired ? "expired" : "unknown";
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const authorization = request.headers.get("authorization") ?? "";

  if (!secret || authorization !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { api_version?: string; event?: RevenueCatEvent };

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = payload.event;

  if (!event?.id || !event.type || !event.app_user_id) {
    return json({ error: "Missing event" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const clerkUserId = findClerkUserId(event);
  const entitlementIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];

  // 1. Record the event first (idempotent on event id) so retries are harmless.
  const { error: eventError } = await supabase.from("revenuecat_events").upsert(
    {
      event_id: event.id,
      event_type: event.type,
      revenuecat_app_user_id: event.app_user_id,
      clerk_user_id: clerkUserId,
      product_id: event.product_id ?? null,
      entitlement_ids: entitlementIds,
      purchased_at: toIso(event.purchased_at_ms),
      expiration_at: toIso(event.expiration_at_ms),
      payload,
    },
    { onConflict: "event_id", ignoreDuplicates: true },
  );

  if (eventError) {
    console.error("Unable to record RevenueCat event", eventError);
    return json({ error: "Unable to record event" }, 500);
  }

  if (RECORD_ONLY_EVENTS.has(event.type)) {
    return json({ ok: true, recorded: true });
  }

  const allowSandbox = Deno.env.get("REVENUECAT_ALLOW_SANDBOX") === "true";

  if (event.environment === "SANDBOX" && !allowSandbox) {
    return json({ ok: true, ignored: "sandbox event" });
  }

  if (!clerkUserId) {
    return json({ ok: true, ignored: "no Clerk user id on event" });
  }

  const now = new Date().toISOString();

  // 2. Make sure the profile row exists (the Clerk webhook may be slower).
  await supabase
    .from("app_users")
    .upsert({ clerk_user_id: clerkUserId }, { onConflict: "clerk_user_id", ignoreDuplicates: true });

  await supabase.from("revenuecat_customers").upsert(
    {
      clerk_user_id: clerkUserId,
      revenuecat_app_user_id: clerkUserId,
      original_app_user_id: event.original_app_user_id ?? null,
      last_seen_at: now,
    },
    { onConflict: "clerk_user_id" },
  );

  // 3. Mirror the entitlement state carried by this event.
  const status = resolveStatus(event);

  for (const entitlementId of entitlementIds) {
    const { error: entitlementError } = await supabase.from("subscription_entitlements").upsert(
      {
        clerk_user_id: clerkUserId,
        revenuecat_app_user_id: clerkUserId,
        entitlement_id: entitlementId,
        product_id: event.product_id ?? null,
        store: event.store ?? null,
        status,
        period_type: event.period_type ?? null,
        latest_purchase_at: toIso(event.purchased_at_ms),
        expires_at: toIso(event.expiration_at_ms),
        will_renew: event.type === "CANCELLATION" ? false : null,
        cancellation_reason: event.cancel_reason ?? event.expiration_reason ?? null,
        raw_customer_info: event,
      },
      { onConflict: "clerk_user_id,entitlement_id" },
    );

    if (entitlementError) {
      console.error("Unable to upsert entitlement", entitlementError);
      return json({ error: "Unable to upsert entitlement" }, 500);
    }
  }

  // 4. Derive the plan from the mirrored entitlements, never from the event alone.
  const { data: activeRows, error: activeError } = await supabase
    .from("subscription_entitlements")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .eq("entitlement_id", PREMIUM_ENTITLEMENT_ID)
    .in("status", ["active", "trialing", "grace_period"])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1);

  if (activeError) {
    console.error("Unable to read entitlements", activeError);
    return json({ error: "Unable to read entitlements" }, 500);
  }

  const userPlan = activeRows && activeRows.length > 0 ? "PRO" : "Free";

  const { error: planError } = await supabase
    .from("app_users")
    .update({ user_plan: userPlan })
    .eq("clerk_user_id", clerkUserId);

  if (planError) {
    console.error("Unable to update user plan", planError);
    return json({ error: "Unable to update user plan" }, 500);
  }

  // 5. A transfer moves the purchase to another App Store account: revoke the
  //    previous owner(s) so two accounts never share one purchase.
  if (event.type === "TRANSFER") {
    const previousOwners = (event.transferred_from ?? []).filter(
      (id) => id.startsWith("user_") && id !== clerkUserId,
    );

    for (const previousOwner of previousOwners) {
      await supabase
        .from("subscription_entitlements")
        .update({ status: "expired", expires_at: now })
        .eq("clerk_user_id", previousOwner)
        .eq("entitlement_id", PREMIUM_ENTITLEMENT_ID);

      await supabase
        .from("app_users")
        .update({ user_plan: "Free" })
        .eq("clerk_user_id", previousOwner);
    }
  }

  return json({ ok: true, clerkUserId, userPlan });
});
