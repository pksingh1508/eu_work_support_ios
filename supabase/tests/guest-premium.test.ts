// Offline test for the `guest-premium` Edge Function: RevenueCat's REST API
// and PostgREST are mocked, so it needs no project, keys or network.
//
// Run: deno test --allow-env --allow-read --allow-net supabase/tests/guest-premium.test.ts
const FN = new URL("../functions/guest-premium/index.ts", import.meta.url).href;
const ANON = "$RCAnonymousID:0123456789abcdef0123456789abcdef";
const ANON_FREE = "$RCAnonymousID:fedcba9876543210fedcba9876543210";
const SUPA = "http://supabase.mock";

Deno.env.set("GUEST_ACCESS_TOKEN_SECRET", "test-secret-".repeat(4));
Deno.env.set("REVENUECAT_SECRET_API_KEY", "sk_test");
Deno.env.set("SUPABASE_URL", SUPA);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key");

let sandbox = true;
const supaCalls: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://api.revenuecat.com/v1/subscribers/")) {
    const id = decodeURIComponent(url.split("/subscribers/")[1]);
    const auth = new Headers(init?.headers ?? (input as Request).headers).get("authorization");
    if (auth !== "Bearer sk_test") return new Response("no", { status: 401 });
    const premium = id === ANON;
    return Response.json({
      subscriber: {
        entitlements: premium
          ? { premium: { expires_date: null, product_identifier: "eu_work_support_premium_lifetime", purchase_date: "2026-09-18T10:00:00Z" } }
          : {},
        non_subscriptions: premium
          ? { eu_work_support_premium_lifetime: [{ id: "x", is_sandbox: sandbox, purchase_date: "2026-09-18T10:00:00Z", store: "app_store" }] }
          : {},
        subscriptions: {},
      },
    });
  }
  if (url.startsWith(SUPA)) {
    supaCalls.push(decodeURIComponent(url.replace(SUPA, "")));
    const headers = new Headers(init?.headers ?? (input as Request).headers);
    if (headers.get("apikey") !== "service-key") return new Response("bad key", { status: 401 });
    if (url.includes("/countries?") && url.includes("select=id&") && url.includes("slug=eq.")) {
      return Response.json(url.includes("slug=eq.greece") ? { id: "c-1" } : null, { status: url.includes("slug=eq.greece") ? 200 : 406 });
    }
    if (url.includes("/countries?")) return Response.json(url.includes("name=ilike") ? [{ id: "c-1" }] : { id: "c-1", slug: "greece", country_documents: [] });
    if (url.includes("/document_categories?")) return Response.json([]);
    if (url.includes("/country_documents?")) {
      if (url.includes("id=eq.")) return Response.json({ id: "d-1", title: "Work visa" });
      return Response.json([{ id: "d-1", title: "Work visa" }]);
    }
    return Response.json([]);
  }
  return realFetch(input as Request, init);
}) as typeof fetch;

let handler: ((r: Request) => Promise<Response>) | null = null;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: (r: Request) => Promise<Response>) => { handler = h; return {} as Deno.HttpServer; };
await import(FN);
if (!handler) throw new Error("handler not captured");

async function call(body: unknown, method = "POST") {
  const res = await handler!(new Request("http://fn/guest-premium", { method, body: method === "POST" ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json" } }));
  return { status: res.status, body: await res.json() };
}
Deno.test("guest-premium: sessions, tokens and content reads", async () => {
  let failures = 0;
  function check(name: string, cond: boolean, extra?: unknown) {
    console.log(`${cond ? "PASS" : "FAIL"} ${name}`, cond ? "" : JSON.stringify(extra));
    if (!cond) failures++;
  }

  check("GET rejected", (await call(null, "GET")).status === 405);
  check("null body -> 400", (await call(null)).status === 400);
  check("array body -> 400", (await call([])).status === 400);
  let r = await call({ action: "session", appUserId: "user_2abc" });
  check("identified id rejected", r.status === 400 && r.body.error === "invalid_app_user_id", r);
  r = await call({ action: "session", appUserId: "$RCAnonymousID:short" });
  check("malformed anon id rejected", r.status === 400, r);

  Deno.env.delete("REVENUECAT_ALLOW_SANDBOX");
  r = await call({ action: "session", appUserId: ANON });
  check("sandbox ignored without flag", r.status === 200 && r.body.ignored === "sandbox purchase" && r.body.token === null && r.body.entitlementActive === true, r);

  Deno.env.set("REVENUECAT_ALLOW_SANDBOX", "true");
  r = await call({ action: "session", appUserId: ANON });
  const token = r.body.token as string;
  check("sandbox accepted with flag -> token", r.status === 200 && typeof token === "string" && r.body.environment === "SANDBOX", r);
  const ttl = r.body.expiresAt - Math.floor(Date.now() / 1000);
  check("token ttl ~7 days", ttl > 7 * 86400 - 60 && ttl <= 7 * 86400, ttl);
  check("expiresIn is the ttl", r.body.expiresIn === 7 * 86400, r.body);

  sandbox = false;
  r = await call({ action: "session", appUserId: ANON });
  check("production purchase -> token", r.status === 200 && typeof r.body.token === "string" && r.body.environment === "PRODUCTION", r);

  r = await call({ action: "session", appUserId: ANON_FREE });
  check("no entitlement -> no token", r.status === 200 && r.body.entitlementActive === false && r.body.token === null, r);

  r = await call({ action: "country", slug: "greece" });
  check("content without token -> 401", r.status === 401, r);
  r = await call({ action: "country", slug: "greece", token: token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA") });
  check("tampered token -> 401", r.status === 401, r);
  const [body] = token.split(".");
  const forgedPayload = btoa(JSON.stringify({ v: 1, sub: ANON_FREE, exp: 9999999999 })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  r = await call({ action: "country", slug: "greece", token: `${forgedPayload}.${token.split(".")[1]}` });
  check("forged payload -> 401", r.status === 401, r);
  check("body decodes", JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - body.length % 4) % 4))).sub === ANON);

  r = await call({ action: "country", slug: "greece", token });
  check("country with token", r.status === 200 && r.body.ok && r.body.data?.slug === "greece", r);
  check("country query filters", supaCalls.some((u) => u.includes("slug=eq.greece") && u.includes("is_active=eq.true") && u.includes("country_documents.status=eq.published") && u.includes("country_documents.language=eq.en")), supaCalls);
  r = await call({ action: "country", slug: "Greece; drop", token });
  check("bad slug -> 400", r.status === 400, r);

  r = await call({ action: "countryId", slug: "greece", token });
  check("countryId", r.status === 200 && r.body.data === "c-1", r);

  r = await call({ action: "document", id: "not-a-uuid", token });
  check("bad doc id -> 400", r.status === 400, r);
  r = await call({ action: "document", id: "123e4567-e89b-12d3-a456-426614174000", token });
  check("document", r.status === 200 && r.body.data?.id === "d-1", r);
  check("document filters", supaCalls.some((u) => u.includes("/country_documents?") && u.includes("id=eq.123e4567") && u.includes("status=eq.published") && u.includes("countries.is_active=eq.true")), supaCalls);

  supaCalls.length = 0;
  r = await call({ action: "search", query: " work   visa ", token });
  check("search", r.status === 200 && Array.isArray(r.body.data) && r.body.data.length >= 1, r);
  check("search ilike", supaCalls.some((u) => u.includes("search_text=ilike.%work+visa%")), supaCalls);
  check("search country ids", supaCalls.some((u) => u.includes("country_id=in.(c-1)")), supaCalls);
  r = await call({ action: "search", query: "a", token });
  check("short query -> 400", r.status === 400, r);
  r = await call({ action: "nope", token });
  check("unknown action -> 400", r.status === 400, r);

  // expired token: shift clock forward 8 days
  const realNow = Date.now;
  Date.now = () => realNow() + 8 * 86400 * 1000;
  r = await call({ action: "country", slug: "greece", token });
  check("expired token -> 401", r.status === 401, r);
  Date.now = realNow;

  if (failures > 0) {
    throw new Error(`${failures} guest-premium checks failed`);
  }
});
