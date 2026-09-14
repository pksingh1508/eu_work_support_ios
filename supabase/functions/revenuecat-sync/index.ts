// Supabase Edge Function: on-demand RevenueCat entitlement sync.
//
// `revenuecat-webhook` only runs when RevenueCat emits an event, and RevenueCat
// emits nothing for a purchase it already knows: buying a non-consumable again
// with the same Apple Account is Apple's free re-download of the original
// transaction, a restore that changes nothing sends nothing, and a webhook
// delivery that failed is simply gone. So the app calls this function after
// every purchase or restore, from "Already paid? Refresh status", and at
// launch when the App Store account owns Premium but the profile says Free.
// It verifies the caller, asks RevenueCat directly whether the `premium`
// entitlement is active and mirrors the answer into the same tables the
// webhook writes. It only ever upgrades: refunds still arrive as webhook
// CANCELLATION events, so a plan granted by hand is never undone here.
//
// Deploy:   supabase functions deploy revenuecat-sync --no-verify-jwt
//           --no-verify-jwt is required: the gateway can only check JWTs issued
//           by Supabase Auth, and the app sends Clerk session tokens. The
//           function verifies the Clerk token itself by calling the Data API
//           with it (Supabase Third-Party Auth validates the signature there).
// Secrets:  supabase secrets set REVENUECAT_SECRET_API_KEY=sk_...
//           (RevenueCat → Project settings → API keys → "+ New" → version V1;
//           never ship this key in the app)
//           REVENUECAT_ALLOW_SANDBOX=true lets sandbox purchases unlock content
//           here, exactly as in the webhook (needed for TestFlight and App Review).
//           SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
//           injected automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const PREMIUM_ENTITLEMENT_ID = "premium";
const REVENUECAT_API_URL = "https://api.revenuecat.com/v1";

type UserPlan = "Free" | "PRO";

type RevenueCatEntitlement = {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
  purchase_date: string;
};

type RevenueCatNonSubscription = {
  id: string;
  is_sandbox: boolean;
  purchase_date: string;
  original_purchase_date?: string;
  store: string;
  store_transaction_id?: string;
};

type RevenueCatSubscription = {
  expires_date: string | null;
  is_sandbox: boolean;
  store: string;
  period_type?: string;
  purchase_date: string;
  original_purchase_date?: string;
  store_transaction_id?: string;
};

type RevenueCatSubscriber = {
  original_app_user_id?: string;
  first_seen?: string;
  last_seen?: string;
  entitlements?: Record<string, RevenueCatEntitlement>;
  non_subscriptions?: Record<string, RevenueCatNonSubscription[]>;
  subscriptions?: Record<string, RevenueCatSubscription>;
};

type Environment = "SANDBOX" | "PRODUCTION";

type SyncResponse = {
  ok: true;
  userPlan: UserPlan;
  /** RevenueCat reports an active `premium` entitlement for this customer. */
  entitlementActive: boolean;
  environment: Environment | null;
  /** Set when the entitlement is active but this server would not unlock it. */
  ignored: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function normalizeUserPlan(value: unknown): UserPlan {
  return typeof value === "string" && value.trim().toUpperCase() === "PRO" ? "PRO" : "Free";
}

function isInFuture(iso: string | null | undefined) {
  return typeof iso === "string" && Date.parse(iso) > Date.now();
}

function latestPurchase(purchases: RevenueCatNonSubscription[]) {
  return [...purchases].sort(
    (a, b) => Date.parse(b.purchase_date) - Date.parse(a.purchase_date),
  )[0] ?? null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("authorization") ?? "";

  if (!/^bearer\s+\S+/i.test(authorization)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

  // 1. Who is calling? The Data API validates the Clerk token (Third-Party
  //    Auth) and `ensure_user_profile` returns the profile of the token's
  //    subject, so the user id comes from the verified token, never from the
  //    request body.
  const caller = createClient(supabaseUrl, anonKey, {
    ...clientOptions,
    global: { headers: { Authorization: authorization } },
  });

  const { data: profileData, error: profileError } = await caller.rpc("ensure_user_profile");
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  const clerkUserId: string | null =
    typeof profile?.clerk_user_id === "string" ? profile.clerk_user_id : null;

  if (profileError || !clerkUserId) {
    console.warn("revenuecat-sync: could not verify the caller", profileError?.message);
    return json({ error: "Unauthorized" }, 401);
  }

  const currentPlan = normalizeUserPlan(profile.user_plan);

  // 2. Ask RevenueCat for the customer's current state.
  const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");

  if (!secretKey) {
    console.error("revenuecat-sync: REVENUECAT_SECRET_API_KEY is not set");
    return json({ error: "sync_not_configured" }, 503);
  }

  let subscriber: RevenueCatSubscriber;

  try {
    const response = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(clerkUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "X-Platform": "ios",
        },
      },
    );

    if (!response.ok) {
      console.error("revenuecat-sync: RevenueCat responded", response.status, await response.text());
      const reason =
        response.status === 401 || response.status === 403
          ? "revenuecat_unauthorized"
          : "revenuecat_unavailable";
      return json({ error: reason }, 502);
    }

    const payload = (await response.json()) as { subscriber?: RevenueCatSubscriber };
    subscriber = payload.subscriber ?? {};
  } catch (error) {
    console.error("revenuecat-sync: RevenueCat request failed", error);
    return json({ error: "revenuecat_unavailable" }, 502);
  }

  const entitlement = subscriber.entitlements?.[PREMIUM_ENTITLEMENT_ID] ?? null;
  const entitlementActive =
    entitlement !== null &&
    (entitlement.expires_date == null ||
      isInFuture(entitlement.expires_date) ||
      isInFuture(entitlement.grace_period_expires_date));

  // The purchase backing the entitlement tells us the store and environment.
  const productId = entitlement?.product_identifier ?? null;
  const nonSubscription = productId
    ? latestPurchase(subscriber.non_subscriptions?.[productId] ?? [])
    : null;
  const subscription = productId ? subscriber.subscriptions?.[productId] ?? null : null;
  const purchase = nonSubscription ?? subscription;
  const environment: Environment | null = purchase
    ? purchase.is_sandbox
      ? "SANDBOX"
      : "PRODUCTION"
    : null;

  const respond = (userPlan: UserPlan, ignored: string | null = null) =>
    json({ ok: true, userPlan, entitlementActive, environment, ignored } satisfies SyncResponse);

  if (!entitlementActive) {
    console.log("revenuecat-sync: no active entitlement", { clerkUserId, currentPlan });
    return respond(currentPlan);
  }

  const allowSandbox = Deno.env.get("REVENUECAT_ALLOW_SANDBOX") === "true";

  if (environment === "SANDBOX" && !allowSandbox) {
    console.log("revenuecat-sync: sandbox purchase ignored (REVENUECAT_ALLOW_SANDBOX is not true)", {
      clerkUserId,
    });
    return respond(currentPlan, "sandbox purchase");
  }

  // 3. Mirror the entitlement into the same rows the webhook maintains.
  const admin = createClient(supabaseUrl, serviceRoleKey, clientOptions);
  const now = new Date().toISOString();

  await admin.from("revenuecat_customers").upsert(
    {
      clerk_user_id: clerkUserId,
      revenuecat_app_user_id: clerkUserId,
      original_app_user_id: subscriber.original_app_user_id ?? null,
      last_seen_at: now,
    },
    { onConflict: "clerk_user_id" },
  );

  const { error: entitlementError } = await admin.from("subscription_entitlements").upsert(
    {
      clerk_user_id: clerkUserId,
      revenuecat_app_user_id: clerkUserId,
      entitlement_id: PREMIUM_ENTITLEMENT_ID,
      product_id: productId,
      store: purchase?.store ?? null,
      status: "active",
      period_type: subscription?.period_type?.toUpperCase() ?? null,
      latest_purchase_at: entitlement.purchase_date ?? purchase?.purchase_date ?? null,
      original_purchase_at: purchase?.original_purchase_date ?? null,
      expires_at: entitlement.expires_date ?? null,
      will_renew: null,
      cancellation_reason: null,
      raw_customer_info: { source: "revenuecat-sync", synced_at: now, entitlement, purchase },
    },
    { onConflict: "clerk_user_id,entitlement_id" },
  );

  if (entitlementError) {
    console.error("Unable to upsert entitlement", entitlementError);
    return json({ error: "Unable to upsert entitlement" }, 500);
  }

  if (currentPlan !== "PRO") {
    const { error: planError } = await admin
      .from("app_users")
      .update({ user_plan: "PRO" })
      .eq("clerk_user_id", clerkUserId);

    if (planError) {
      console.error("Unable to update user plan", planError);
      return json({ error: "Unable to update user plan" }, 500);
    }
  }

  console.log("revenuecat-sync: Premium active", { clerkUserId, environment, productId });
  return respond("PRO");
});
