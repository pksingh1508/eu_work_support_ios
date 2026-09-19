// Supabase Edge Function: Premium without an account ("guest" Premium).
//
// App Store Review Guideline 5.1.1(v): Premium is a one-time purchase that is
// not tied to an account, so the app must let people buy and use it without
// registering. A guest buys with RevenueCat's anonymous app user id
// (`$RCAnonymousID:…`, generated and kept on the device by the SDK). Content
// RLS only admits members whose `app_users.user_plan` is PRO, and a guest has
// no Clerk session, so this function does two things for guests:
//
//   1. `session`: asks RevenueCat's REST API whether the anonymous id holds
//      the `premium` entitlement and, if so, returns a signed access token
//      (valid 7 days, renewed daily by the app). The entitlement is only ever
//      taken from RevenueCat, never from the request.
//   2. `country` / `countryId` / `document` / `search`: serves the Premium
//      content reads the app makes (the same selects and filters as the
//      member queries in `src/features/*-service.ts`) to holders of a valid
//      token, reading with the service role.
//
// Signed-in members never call this function; their access stays with RLS
// and `revenuecat-sync`. When a guest later creates an account or logs in,
// the app moves the anonymous purchase to the Clerk user id (`logIn`, plus a
// restore when RevenueCat does not merge on its own) and the member path
// takes over.
//
// Deploy:   supabase functions deploy guest-premium --no-verify-jwt
//           --no-verify-jwt is required: guests have no user JWT at all.
// Secrets:  GUEST_ACCESS_TOKEN_SECRET=<long random string>, e.g. `openssl rand -hex 32`
//           (signs the access tokens; falls back to the service role key)
//           REVENUECAT_SECRET_API_KEY=sk_...   (already set for revenuecat-sync)
//           REVENUECAT_ALLOW_SANDBOX=true lets sandbox purchases unlock content,
//           exactly as in the other two functions. App Review and TestFlight
//           buy in the sandbox, so it must be true for the review build.
//           SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEYS)
//           are injected automatically.
//
// An anonymous id is 128 random bits known only to the device, RevenueCat and
// this function, so it works like a bearer secret: sharing it shares Premium,
// just as sharing account credentials would.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const PREMIUM_ENTITLEMENT_ID = "premium";
const REVENUECAT_API_URL = "https://api.revenuecat.com/v1";
/**
 * How long a guest access token stays valid. The app renews it once it is a
 * day old, so a refund or transfer is picked up within about a day.
 */
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_VERSION = 1;
/** RevenueCat's anonymous ids: `$RCAnonymousID:` + 32 lowercase hex characters. */
const ANONYMOUS_APP_USER_ID = /^\$RCAnonymousID:[a-z0-9]{32}$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 80;
const SEARCH_LIMIT = 25;

// Keep these selects identical to the member queries in the app:
// countrySelect → src/features/countries/country-service.ts
// documentSelect → src/features/documents/document-service.ts
// searchSelect → src/features/search/search-service.ts
const countrySelect = `
  id,
  slug,
  name,
  flag_emoji,
  short_description,
  popularity_rank,
  official_url,
  official_immigration_url,
  last_reviewed_at,
  country_documents (
    id,
    title,
    slug,
    short_description,
    intro,
    content_json,
    is_premium,
    tags,
    sort_order,
    language,
    status,
    document_categories (
      id,
      name,
      slug,
      icon,
      sort_order
    )
  )
`;

const documentSelect = `
  id,
  title,
  slug,
  short_description,
  intro,
  content_json,
  is_premium,
  tags,
  sort_order,
  language,
  status,
  countries!inner (
    id,
    name,
    slug,
    flag_emoji,
    short_description,
    is_active
  ),
  document_categories!inner (
    id,
    name,
    slug,
    icon,
    sort_order
  )
`;

const searchSelect = `
  id,
  title,
  slug,
  short_description,
  is_premium,
  language,
  sort_order,
  countries!inner (
    id,
    name,
    slug,
    flag_emoji,
    popularity_rank,
    is_active
  ),
  document_categories!inner (
    id,
    name,
    slug,
    sort_order
  )
`;

type Environment = "SANDBOX" | "PRODUCTION";

type RevenueCatEntitlement = {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
  purchase_date: string;
};

type RevenueCatPurchase = {
  is_sandbox: boolean;
  purchase_date: string;
};

type RevenueCatSubscriber = {
  entitlements?: Record<string, RevenueCatEntitlement>;
  non_subscriptions?: Record<string, RevenueCatPurchase[]>;
  subscriptions?: Record<string, RevenueCatPurchase>;
};

type TokenPayload = {
  v: number;
  /** The anonymous RevenueCat app user id the entitlement was verified for. */
  sub: string;
  /** Expiry, seconds since the epoch. */
  exp: number;
};

type RequestBody = {
  action?: unknown;
  appUserId?: unknown;
  token?: unknown;
  slug?: unknown;
  id?: unknown;
  query?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isInFuture(iso: string | null | undefined) {
  return typeof iso === "string" && Date.parse(iso) > Date.now();
}

function latestPurchase(purchases: RevenueCatPurchase[]) {
  return [...purchases].sort(
    (a, b) => Date.parse(b.purchase_date) - Date.parse(a.purchase_date),
  )[0] ?? null;
}

/**
 * Service-role key for content reads: the legacy variable, or the default key
 * of the newer `SUPABASE_SECRET_KEYS` JSON map that replaces it.
 */
function getServiceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (legacy) {
    return legacy;
  }

  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? null;
  } catch {
    return null;
  }
}

// --- Access tokens -----------------------------------------------------------
// `<base64url(payload)>.<base64url(HMAC-SHA256(payload))>`. Only this function
// issues and reads them, so a plain HMAC is enough; there is no JWT library or
// Supabase JWT secret involved.

const encoder = new TextEncoder();
let signingKeyPromise: Promise<CryptoKey> | null = null;

function getSigningKey() {
  if (!signingKeyPromise) {
    const secret = Deno.env.get("GUEST_ACCESS_TOKEN_SECRET") ?? getServiceKey();

    if (!secret) {
      throw new Error("GUEST_ACCESS_TOKEN_SECRET is not set");
    }

    if (!Deno.env.get("GUEST_ACCESS_TOKEN_SECRET")) {
      // Works, but rotating the service role key would then sign every guest
      // out until their app re-verifies (it does so automatically).
      console.warn("guest-premium: GUEST_ACCESS_TOKEN_SECRET is not set; using the service role key");
    }

    signingKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }

  return signingKeyPromise;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function issueToken(appUserId: string) {
  const payload: TokenPayload = {
    v: TOKEN_VERSION,
    sub: appUserId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), encoder.encode(body));

  return { token: `${body}.${toBase64Url(new Uint8Array(signature))}`, expiresAt: payload.exp };
}

/** The verified payload, or null for a malformed, forged or expired token. */
async function readToken(token: unknown): Promise<TokenPayload | null> {
  if (typeof token !== "string" || token.length > 1024) {
    return null;
  }

  const [body, signature, extra] = token.split(".");

  if (!body || !signature || extra !== undefined) {
    return null;
  }

  try {
    // crypto.subtle.verify compares in constant time.
    const isValid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      fromBase64Url(signature),
      encoder.encode(body),
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as TokenPayload;

    if (
      payload.v !== TOKEN_VERSION ||
      typeof payload.sub !== "string" ||
      !ANONYMOUS_APP_USER_ID.test(payload.sub) ||
      typeof payload.exp !== "number" ||
      payload.exp * 1000 <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// --- Actions -----------------------------------------------------------------

async function createSession(appUserId: unknown) {
  if (typeof appUserId !== "string" || !ANONYMOUS_APP_USER_ID.test(appUserId)) {
    // Identified ids (Clerk `user_…`) belong to members, who use RLS instead.
    return json({ error: "invalid_app_user_id" }, 400);
  }

  const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");

  if (!secretKey) {
    console.error("guest-premium: REVENUECAT_SECRET_API_KEY is not set");
    return json({ error: "not_configured" }, 503);
  }

  let subscriber: RevenueCatSubscriber;

  try {
    const response = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" } },
    );

    if (!response.ok) {
      console.error("guest-premium: RevenueCat responded", response.status, await response.text());
      const reason =
        response.status === 401 || response.status === 403
          ? "revenuecat_unauthorized"
          : "revenuecat_unavailable";
      return json({ error: reason }, 502);
    }

    const payload = (await response.json()) as { subscriber?: RevenueCatSubscriber };
    subscriber = payload.subscriber ?? {};
  } catch (error) {
    console.error("guest-premium: RevenueCat request failed", error);
    return json({ error: "revenuecat_unavailable" }, 502);
  }

  const entitlement = subscriber.entitlements?.[PREMIUM_ENTITLEMENT_ID] ?? null;
  const entitlementActive =
    entitlement !== null &&
    (entitlement.expires_date == null ||
      isInFuture(entitlement.expires_date) ||
      isInFuture(entitlement.grace_period_expires_date));
  const productId = entitlement?.product_identifier ?? null;
  const purchase = productId
    ? latestPurchase(subscriber.non_subscriptions?.[productId] ?? []) ??
      subscriber.subscriptions?.[productId] ??
      null
    : null;
  const environment: Environment | null = purchase
    ? purchase.is_sandbox
      ? "SANDBOX"
      : "PRODUCTION"
    : null;

  const noToken = { token: null, expiresAt: null, expiresIn: null };

  if (!entitlementActive) {
    return json({ ok: true, entitlementActive, environment, ignored: null, ...noToken });
  }

  if (environment === "SANDBOX" && Deno.env.get("REVENUECAT_ALLOW_SANDBOX") !== "true") {
    console.log("guest-premium: sandbox purchase ignored (REVENUECAT_ALLOW_SANDBOX is not true)");
    return json({ ok: true, entitlementActive, environment, ignored: "sandbox purchase", ...noToken });
  }

  const { token, expiresAt } = await issueToken(appUserId);
  console.log("guest-premium: Premium active", { environment, productId });
  // `expiresIn` lets the app time the token with its own clock, which may be
  // set differently from the server's.
  return json({
    ok: true,
    entitlementActive,
    environment,
    ignored: null,
    token,
    expiresAt,
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

async function readCountry(admin: SupabaseClient, slug: unknown) {
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return json({ error: "invalid_slug" }, 400);
  }

  const { data, error } = await admin
    .from("countries")
    .select(countrySelect)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("country_documents.status", "published")
    .eq("country_documents.language", "en")
    .maybeSingle();

  if (error) {
    console.error("guest-premium: country query failed", error);
    return json({ error: "query_failed" }, 500);
  }

  return json({ ok: true, data });
}

async function readCountryId(admin: SupabaseClient, slug: unknown) {
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return json({ error: "invalid_slug" }, 400);
  }

  const { data, error } = await admin
    .from("countries")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("guest-premium: country id query failed", error);
    return json({ error: "query_failed" }, 500);
  }

  return json({ ok: true, data: data?.id ?? null });
}

async function readDocument(admin: SupabaseClient, id: unknown) {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return json({ error: "invalid_id" }, 400);
  }

  const { data, error } = await admin
    .from("country_documents")
    .select(documentSelect)
    .eq("id", id)
    .eq("status", "published")
    .eq("language", "en")
    .eq("countries.is_active", true)
    .maybeSingle();

  if (error) {
    console.error("guest-premium: document query failed", error);
    return json({ error: "query_failed" }, 500);
  }

  return json({ ok: true, data });
}

/**
 * Same matching as the member search: guides whose text matches, plus every
 * guide of a matching country or category. Returns raw rows; the app merges,
 * de-duplicates and sorts them exactly as it does for members.
 */
async function search(admin: SupabaseClient, query: unknown) {
  const normalized =
    typeof query === "string" ? query.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_LENGTH) : "";

  if (normalized.length < MIN_SEARCH_LENGTH) {
    return json({ error: "invalid_query" }, 400);
  }

  const pattern = `%${normalized.replace(/[%_]/g, "")}%`;
  const publishedDocuments = () =>
    admin
      .from("country_documents")
      .select(searchSelect)
      .eq("status", "published")
      .eq("language", "en")
      .eq("countries.is_active", true);

  const [documents, countries, categories] = await Promise.all([
    publishedDocuments().ilike("search_text", pattern).limit(SEARCH_LIMIT),
    admin.from("countries").select("id").eq("is_active", true).ilike("name", pattern).limit(10),
    admin.from("document_categories").select("id").ilike("name", pattern).limit(10),
  ]);

  const firstError = documents.error ?? countries.error ?? categories.error;

  if (firstError) {
    console.error("guest-premium: search query failed", firstError);
    return json({ error: "query_failed" }, 500);
  }

  const countryIds = (countries.data ?? []).map((row) => row.id);
  const categoryIds = (categories.data ?? []).map((row) => row.id);
  const extra = await Promise.all([
    countryIds.length > 0
      ? publishedDocuments().in("country_id", countryIds).limit(SEARCH_LIMIT)
      : null,
    categoryIds.length > 0
      ? publishedDocuments().in("category_id", categoryIds).limit(SEARCH_LIMIT)
      : null,
  ]);
  const rows = [...(documents.data ?? [])];

  for (const response of extra) {
    if (!response) {
      continue;
    }

    if (response.error) {
      console.error("guest-premium: search query failed", response.error);
      return json({ error: "query_failed" }, 500);
    }

    rows.push(...(response.data ?? []));
  }

  return json({ ok: true, data: rows });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    if (body.action === "session") {
      return await createSession(body.appUserId);
    }

    if (!(await readToken(body.token))) {
      return json({ error: "invalid_token" }, 401);
    }

    const serviceKey = getServiceKey();

    if (!serviceKey) {
      console.error("guest-premium: no service role key is available");
      return json({ error: "not_configured" }, 503);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    switch (body.action) {
      case "country":
        return await readCountry(admin, body.slug);
      case "countryId":
        return await readCountryId(admin, body.slug);
      case "document":
        return await readDocument(admin, body.id);
      case "search":
        return await search(admin, body.query);
      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    console.error("guest-premium: request failed", error);
    return json({ error: "internal_error" }, 500);
  }
});
