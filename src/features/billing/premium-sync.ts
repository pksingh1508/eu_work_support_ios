import { normalizeUserPlan, type UserPlan } from "@/features/auth/access";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/with-timeout";

/**
 * Outcome of a server-side entitlement check (Edge Function `revenuecat-sync`).
 * The function asks RevenueCat directly whether this account holds the
 * `premium` entitlement and mirrors the answer into `app_users.user_plan`, so
 * activation does not depend on a webhook event. RevenueCat sends no event for
 * a purchase it already knows: Apple's free re-download of an owned
 * non-consumable, or a restore that changes nothing.
 */
export type PremiumSyncResult = {
  userPlan: UserPlan;
  /** RevenueCat reports an active Premium entitlement for this account. */
  entitlementActive: boolean;
  environment: "SANDBOX" | "PRODUCTION" | null;
  /** Reason the server saw an active entitlement but would not unlock it. */
  ignored: string | null;
};

type PremiumSyncResponse = {
  ok?: boolean;
  userPlan?: string;
  entitlementActive?: boolean;
  environment?: string | null;
  ignored?: string | null;
  error?: string;
};

const SYNC_FUNCTION = "revenuecat-sync";
const SYNC_TIMEOUT_MS = 15000;

let inFlight: Promise<PremiumSyncResult | null> | null = null;

/**
 * Asks the server to verify the Premium entitlement with RevenueCat and mirror
 * it into Supabase. Resolves to null when the server could not do that (the
 * function is not deployed, its secret is missing, the user is signed out or
 * the network failed) so callers fall back to waiting for the webhook.
 * Concurrent calls share one request.
 */
export function syncPremiumWithServer(): Promise<PremiumSyncResult | null> {
  if (!inFlight) {
    inFlight = requestSync().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}

async function requestSync(): Promise<PremiumSyncResult | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke<PremiumSyncResponse>(SYNC_FUNCTION, { method: "POST", body: {} }),
      SYNC_TIMEOUT_MS,
      "Checking your purchase took too long.",
    );

    if (error || !data?.ok) {
      if (__DEV__) {
        const status = (error as { context?: { status?: number } } | null)?.context?.status;
        console.warn(
          `Premium sync unavailable${status ? ` (HTTP ${status})` : ""}`,
          error ?? data?.error ?? data,
        );
      }

      return null;
    }

    return {
      userPlan: normalizeUserPlan(data.userPlan),
      entitlementActive: data.entitlementActive === true,
      environment:
        data.environment === "SANDBOX" || data.environment === "PRODUCTION"
          ? data.environment
          : null,
      ignored: typeof data.ignored === "string" && data.ignored ? data.ignored : null,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn("Premium sync failed", error);
    }

    return null;
  }
}
