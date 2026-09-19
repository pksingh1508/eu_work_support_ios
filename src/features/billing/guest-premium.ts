import Purchases from "react-native-purchases";
import { create } from "zustand";

import { isPurchasesAvailable, usePurchasesStore } from "@/features/billing/purchases";
import { appStorage, localStorageKeys } from "@/lib/local-storage";
import { supabase } from "@/lib/supabase";
import { UserFacingError } from "@/lib/user-facing-error";
import { withTimeout } from "@/lib/with-timeout";

/**
 * Premium without an account (App Store Review Guideline 5.1.1(v)).
 *
 * Premium is a one-time purchase that is not tied to an account, so a guest
 * can buy and use it without registering. RevenueCat identifies a guest by
 * the anonymous app user id it keeps on the device (`$RCAnonymousID:…`).
 * Content RLS only admits signed-in PRO members, so for guests the Edge
 * Function `guest-premium` asks RevenueCat whether that anonymous id owns the
 * `premium` entitlement and hands back a short-lived access token, which the
 * app then uses to read Premium content through the same function.
 *
 * Creating an account stays optional: signing in moves the purchase to the
 * Clerk user (`Purchases.logIn`), which is what lets Premium follow the
 * person to their other devices. On a second device, a guest can also just
 * use Restore purchase with the same Apple Account.
 */

const GUEST_PREMIUM_FUNCTION = "guest-premium";
const REQUEST_TIMEOUT_MS = 15000;
/** Content reads re-verify a little before the server's token expires. */
const TOKEN_REFRESH_MARGIN_MS = 10 * 60 * 1000;
/**
 * Tokens last 7 days on the server; the app quietly renews one at launch or
 * foreground once it is a day old, so a refund or transfer is noticed within
 * a day and an active guest never runs into an expired token.
 */
const TOKEN_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_APP_USER_ID_PREFIX = "$RCAnonymousID:";

const GUEST_CHECK_FAILED_MESSAGE =
  "We could not confirm your Premium purchase right now. Check your connection and try again.";

/**
 * - `inactive`: this device's App Store purchases hold no Premium (or were
 *   never checked because there is nothing to check).
 * - `checking`: asking the server (also the launch state when the last token
 *   has expired, so a guest who owns Premium sees a skeleton, not a paywall).
 * - `active`: the server confirmed Premium and issued a token.
 * - `ignored`: Premium was bought, but the server will not unlock sandbox
 *   purchases.
 * - `error`: the check failed (offline, function not deployed).
 */
export type GuestPremiumStatus = "inactive" | "checking" | "active" | "ignored" | "error";

type GuestSession = {
  appUserId: string;
  token: string;
  /** Milliseconds since the epoch. */
  issuedAt: number;
  /** Milliseconds since the epoch. */
  expiresAt: number;
};

type GuestPremiumState = {
  status: GuestPremiumStatus;
  session: GuestSession | null;
};

type SessionResponse = {
  ok?: boolean;
  entitlementActive?: boolean;
  ignored?: string | null;
  token?: string | null;
  /** Seconds since the epoch (server clock). */
  expiresAt?: number | null;
  /** Token lifetime in seconds; timed with the device clock. */
  expiresIn?: number | null;
  error?: string;
};

type ContentResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

export function isAnonymousAppUserId(appUserId: string | null | undefined) {
  return Boolean(appUserId?.startsWith(ANONYMOUS_APP_USER_ID_PREFIX));
}

function isUsable(session: GuestSession | null, marginMs = 0): session is GuestSession {
  return Boolean(session && session.expiresAt - marginMs > Date.now());
}

/** The stored session, and whether one existed but has expired. */
function readStoredSession(): { session: GuestSession | null; hadExpired: boolean } {
  const raw = appStorage.getString(localStorageKeys.guestPremiumSession);

  if (!raw) {
    return { session: null, hadExpired: false };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GuestSession>;

    if (
      typeof parsed.appUserId === "string" &&
      typeof parsed.token === "string" &&
      typeof parsed.issuedAt === "number" &&
      typeof parsed.expiresAt === "number"
    ) {
      const session = parsed as GuestSession;
      // An expired entry is kept as a hint until the next check replaces it.
      return isUsable(session)
        ? { session, hadExpired: false }
        : { session: null, hadExpired: true };
    }
  } catch {
    // Fall through: a corrupt entry is dropped below.
  }

  appStorage.remove(localStorageKeys.guestPremiumSession);
  return { session: null, hadExpired: false };
}

function writeStoredSession(session: GuestSession | null) {
  if (session) {
    appStorage.set(localStorageKeys.guestPremiumSession, JSON.stringify(session));
  } else {
    appStorage.remove(localStorageKeys.guestPremiumSession);
  }
}

const stored = readStoredSession();

/**
 * A stored, unexpired token counts as Premium straight away, so a guest who
 * bought Premium never sees a paywall flash at launch. The bridge re-checks
 * it with the server in the background.
 */
export const useGuestPremiumStore = create<GuestPremiumState>(() => ({
  status: stored.session ? "active" : stored.hadExpired ? "checking" : "inactive",
  session: stored.session,
}));

/**
 * Bumped by `clearGuestPremium`, so a check that was already running when
 * someone signed in cannot write its (now stale) guest session back.
 */
let sessionGeneration = 0;

/**
 * Forgets the guest session. Called when someone signs in: the purchase then
 * belongs to their account and RLS decides access.
 */
export function clearGuestPremium() {
  sessionGeneration += 1;
  writeStoredSession(null);
  useGuestPremiumStore.setState({ status: "inactive", session: null });
}

let inFlight: Promise<GuestPremiumStatus> | null = null;
/** Whether the request in flight asks the server regardless of the stored token. */
let inFlightIsForced = false;

type VerifyOptions = {
  /** Always ask the server (after a purchase, restore or entitlement change). */
  force?: boolean;
  /** Renew a token older than a day (launch and foreground). */
  renew?: boolean;
};

/**
 * Asks the server whether this device's anonymous RevenueCat user owns
 * Premium and stores the access token it returns. Reuses a token that is not
 * about to expire unless `force` (or `renew`, for a day-old token) is set.
 * Never throws; concurrent calls share one request.
 */
export function verifyGuestPremium(options: VerifyOptions = {}): Promise<GuestPremiumStatus> {
  const force = options.force ?? false;

  if (inFlight && (inFlightIsForced || !force)) {
    return inFlight;
  }

  // A forced check must reach the server: when a plain check (which may just
  // reuse the stored token) is already running, queue the forced one after it.
  const previous = inFlight ?? Promise.resolve<GuestPremiumStatus>("inactive");
  const next = previous
    .catch(() => "inactive" as const)
    .then(() => requestGuestSession(options))
    .finally(() => {
      if (inFlight === next) {
        inFlight = null;
        inFlightIsForced = false;
      }
    });

  inFlight = next;
  inFlightIsForced = force;
  return next;
}

async function requestGuestSession({ force = false, renew = false }: VerifyOptions) {
  const { status, session } = useGuestPremiumStore.getState();
  const generation = sessionGeneration;
  const isStale = () => generation !== sessionGeneration;

  if (!isPurchasesAvailable()) {
    // No store in this build, so no purchase can exist to check.
    clearGuestPremium();
    return "inactive";
  }

  if (!usePurchasesStore.getState().isConfigured) {
    // The launch bridge verifies again as soon as RevenueCat is configured.
    return status;
  }

  let appUserId: string;

  try {
    appUserId = await Purchases.getAppUserID();
  } catch (error) {
    console.warn("Unable to read the RevenueCat app user id", error);

    if (isStale()) {
      return useGuestPremiumStore.getState().status;
    }

    if (status === "checking") {
      useGuestPremiumStore.setState({ status: "error" });
      return "error";
    }

    return status;
  }

  if (isStale()) {
    return useGuestPremiumStore.getState().status;
  }

  if (!isAnonymousAppUserId(appUserId)) {
    // Identified (signed-in) users get Premium through their account.
    clearGuestPremium();
    return "inactive";
  }

  const ownSession = session?.appUserId === appUserId ? session : null;
  const isDueForRenewal = Boolean(
    renew && ownSession && Date.now() - ownSession.issuedAt > TOKEN_RENEW_AFTER_MS,
  );

  if (!force && !isDueForRenewal && isUsable(ownSession, TOKEN_REFRESH_MARGIN_MS)) {
    useGuestPremiumStore.setState({ status: "active", session: ownSession });
    return "active";
  }

  // Keep showing Premium while a still-valid token is being renewed.
  useGuestPremiumStore.setState({ status: isUsable(ownSession) ? "active" : "checking" });

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke<SessionResponse>(GUEST_PREMIUM_FUNCTION, {
        method: "POST",
        body: { action: "session", appUserId },
      }),
      REQUEST_TIMEOUT_MS,
      GUEST_CHECK_FAILED_MESSAGE,
    );

    if (error || !data?.ok) {
      throw error ?? new Error(data?.error ?? "guest-premium session failed");
    }

    if (isStale()) {
      return useGuestPremiumStore.getState().status;
    }

    // Time the token with the device clock (`expiresIn`), so a clock that is
    // set differently from the server's cannot make a fresh token look expired.
    const lifetimeMs =
      typeof data.expiresIn === "number" && data.expiresIn > 0
        ? data.expiresIn * 1000
        : typeof data.expiresAt === "number"
          ? data.expiresAt * 1000 - Date.now()
          : 0;

    if (data.token && lifetimeMs > 0) {
      const issuedAt = Date.now();
      const nextSession = {
        appUserId,
        token: data.token,
        issuedAt,
        expiresAt: issuedAt + lifetimeMs,
      };
      writeStoredSession(nextSession);
      useGuestPremiumStore.setState({ status: "active", session: nextSession });
      return "active";
    }

    const nextStatus: GuestPremiumStatus =
      data.entitlementActive && data.ignored ? "ignored" : "inactive";
    writeStoredSession(null);
    useGuestPremiumStore.setState({ status: nextStatus, session: null });
    return nextStatus;
  } catch (error) {
    if (__DEV__) {
      const httpStatus = (error as { context?: { status?: number } } | null)?.context?.status;
      console.warn(
        `Guest Premium check failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}`,
        error,
      );
    }

    if (isStale()) {
      return useGuestPremiumStore.getState().status;
    }

    // Offline or a server hiccup must not take away Premium that was already
    // confirmed: keep an unexpired token.
    if (isUsable(ownSession)) {
      useGuestPremiumStore.setState({ status: "active", session: ownSession });
      return "active";
    }

    // Keep whatever is stored (an expired token is the launch hint that this
    // device owns Premium); only a definite server answer replaces it.
    useGuestPremiumStore.setState({ status: "error", session: null });
    return "error";
  }
}

async function getGuestToken(force: boolean) {
  const { session } = useGuestPremiumStore.getState();

  if (!force && isUsable(session, TOKEN_REFRESH_MARGIN_MS)) {
    return session.token;
  }

  const status = await verifyGuestPremium({ force });
  const next = useGuestPremiumStore.getState().session;

  if (status !== "active" || !isUsable(next)) {
    throw new UserFacingError(GUEST_CHECK_FAILED_MESSAGE);
  }

  return next.token;
}

type GuestContentRequest =
  | { action: "country"; slug: string }
  | { action: "countryId"; slug: string }
  | { action: "document"; id: string }
  | { action: "search"; query: string };

/**
 * Reads Premium content for a guest who owns Premium. Returns the same raw
 * rows the member Supabase query returns, so callers map both identically.
 * A rejected token (expired, or the purchase was refunded) is re-verified
 * once before giving up.
 */
export async function fetchGuestContent<T>(request: GuestContentRequest): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await getGuestToken(attempt > 0);
    const { data, error } = await withTimeout(
      supabase.functions.invoke<ContentResponse<T>>(GUEST_PREMIUM_FUNCTION, {
        method: "POST",
        body: { ...request, token },
      }),
      REQUEST_TIMEOUT_MS,
      "Loading this content took too long. Please try again.",
    );

    const httpStatus = (error as { context?: { status?: number } } | null)?.context?.status;

    if (httpStatus === 401 && attempt === 0) {
      continue;
    }

    if (error || !data?.ok) {
      throw error ?? new Error(data?.error ?? "guest-premium request failed");
    }

    return data.data as T;
  }

  throw new UserFacingError(GUEST_CHECK_FAILED_MESSAGE);
}
