import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import {
  clearGuestPremium,
  useGuestPremiumStore,
  verifyGuestPremium,
} from "@/features/billing/guest-premium";
import { syncPremiumWithServer } from "@/features/billing/premium-sync";
import {
  ensurePremiumOffer,
  isTransientPurchasesError,
  restorePremium,
  syncPurchasesUser,
  usePurchasesStore,
} from "@/features/billing/purchases";
import { appStorage, localStorageKeys } from "@/lib/local-storage";

/**
 * Configures RevenueCat at launch and keeps its app user id in step with the
 * Clerk session (login → `Purchases.logIn`, signed out → anonymous user).
 *
 * Also keeps the Premium price in step with the App Store storefront, the
 * country Apple prices for: the storefront is read from StoreKit at launch
 * and every time the app returns to the foreground, and a change (another
 * Apple Account, or the same account moved to another country) reloads the
 * offer so no screen keeps showing a price from the previous storefront.
 *
 * Guests (no account) get Premium from their own App Store purchase: the
 * bridge asks the server to confirm it at launch, whenever the store
 * entitlement changes and once a day in the foreground (`guest-premium.ts`).
 * When a guest who owns Premium logs in, the purchase is moved to their
 * account; RevenueCat merges it on `logIn` only for accounts that never had
 * an anonymous alias, so a restore finishes the job for the others. The move
 * is remembered on disk until it has worked, so an interrupted one is retried
 * on the next launch, and it activates the account itself (`revenuecat-sync`)
 * because RevenueCat sends no webhook event for a merge.
 *
 * Finally, it self-heals a stuck activation: when the App Store account owns
 * Premium but the Supabase profile still says Free (a webhook event never
 * arrived, or none was ever sent because the purchase was a restore or a
 * re-download), it asks the server once per user to verify with RevenueCat.
 * Renders nothing.
 */
export function PurchasesBridge() {
  const { isAuthLoaded, isGuest, userId, profile, planStatus, refreshProfile } = useAuthAccess();
  const hasStoreEntitlement = usePurchasesStore((state) => state.hasStoreEntitlement);
  const customerInfo = usePurchasesStore((state) => state.customerInfo);
  const email = profile?.email ?? null;
  const healedUserRef = useRef<string | null>(null);
  /** A guest purchase is being moved into the signed-in account. */
  const movingPurchaseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    // Read before `logIn` replaces the anonymous customer: did this device
    // own Premium as a guest? Remembered on disk until the move has worked.
    if (userId && isGuestPremiumOwner()) {
      appStorage.set(localStorageKeys.pendingGuestPurchaseMove, 0);
      markMovingGuestPurchase();
    }

    const settleMoveFlag = () => {
      if (!movingPurchaseRef.current) {
        usePurchasesStore.setState({ isMovingGuestPurchase: false });
      }
    };

    syncPurchasesUser(userId ?? null, email)
      .then(async () => {
        void ensurePremiumOffer();

        if (!userId) {
          settleMoveFlag();
          await renewGuestPremium();
          return;
        }

        clearGuestPremium();

        if (
          appStorage.getNumber(localStorageKeys.pendingGuestPurchaseMove) !== undefined &&
          !movingPurchaseRef.current &&
          !movedThisLaunch.has(userId)
        ) {
          movedThisLaunch.add(userId);
          movingPurchaseRef.current = moveGuestPurchaseToAccount(refreshProfile).finally(() => {
            movingPurchaseRef.current = null;
            usePurchasesStore.setState({ isMovingGuestPurchase: false });
          });
          await movingPurchaseRef.current;
        } else {
          settleMoveFlag();
        }
      })
      .catch((error) => {
        console.warn("Unable to sync the purchases user", error);
        settleMoveFlag();

        // Offline: still settle a guest's pending check (e.g. an expired
        // token at launch) instead of leaving it "checking".
        if (!userId) {
          void renewGuestPremium();
        }
      });
  }, [email, isAuthLoaded, refreshProfile, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void ensurePremiumOffer();

        if (isGuest) {
          void renewGuestPremium();
        }
      }
    });

    return () => subscription.remove();
  }, [isGuest]);

  // Guests: a new store entitlement (a purchase or restore that finished
  // outside the Billing screen, or a purchase from another device) needs the
  // server's confirmation, and a lost one (refund, or the purchase moved to
  // another user) must drop the stored access token.
  useEffect(() => {
    const live = usePurchasesStore.getState();

    // Only react to the guest's own, current CustomerInfo: at sign-out this
    // render can still carry the member's, which the store has already dropped.
    if (
      !isGuest ||
      !customerInfo ||
      live.customerInfo !== customerInfo ||
      live.customerKind !== "anonymous"
    ) {
      return;
    }

    const { status } = useGuestPremiumStore.getState();

    if (hasStoreEntitlement ? status !== "active" : status === "active") {
      void verifyGuestPremium({ force: true });
    }
  }, [customerInfo, hasStoreEntitlement, isGuest]);

  useEffect(() => {
    if (
      !userId ||
      planStatus !== "free" ||
      !hasStoreEntitlement ||
      healedUserRef.current === userId ||
      // The guest-purchase move activates the account itself when it is done.
      movingPurchaseRef.current
    ) {
      return;
    }

    healedUserRef.current = userId;

    syncPremiumWithServer()
      .then((result) => {
        if (result?.userPlan === "PRO") {
          return refreshProfile();
        }

        // Allow another attempt the next time the entitlement or plan changes.
        healedUserRef.current = null;
        return null;
      })
      .catch((error) => {
        healedUserRef.current = null;
        console.warn("Unable to sync the Premium plan", error);
      });
  }, [hasStoreEntitlement, planStatus, refreshProfile, userId]);

  return null;
}

/** Launches (one attempt each) before a failed move is given up. */
const MAX_PURCHASE_MOVE_ATTEMPTS = 3;
/** Members whose pending move already ran in this JS session. */
const movedThisLaunch = new Set<string>();
/** Never keep a member's plan "unknown" longer than this for a move. */
const MOVING_FLAG_TIMEOUT_MS = 20000;
let movingFlagTimer: ReturnType<typeof setTimeout> | null = null;

function markMovingGuestPurchase() {
  usePurchasesStore.setState({ isMovingGuestPurchase: true });

  if (movingFlagTimer) {
    clearTimeout(movingFlagTimer);
  }

  movingFlagTimer = setTimeout(() => {
    movingFlagTimer = null;
    usePurchasesStore.setState({ isMovingGuestPurchase: false });
  }, MOVING_FLAG_TIMEOUT_MS);
}

/**
 * True while signed out with Premium from this device's App Store purchase,
 * i.e. what a sign-in has to carry over into the account. A member's own
 * entitlement never counts.
 */
function isGuestPremiumOwner() {
  const { hasStoreEntitlement, customerKind } = usePurchasesStore.getState();

  return (
    useGuestPremiumStore.getState().status === "active" ||
    (hasStoreEntitlement && customerKind === "anonymous")
  );
}

/**
 * Moves a guest's purchase into the account that just signed in and
 * activates it there. `logIn` has already merged it when RevenueCat could;
 * otherwise a restore aliases the anonymous buyer into this account (no
 * prompt under StoreKit 2). RevenueCat sends no webhook for either, so the
 * plan is set through `revenuecat-sync`. The pending mark is cleared once the
 * account holds the entitlement; a failed move is retried on the next launch
 * or sign-in, up to `MAX_PURCHASE_MOVE_ATTEMPTS` times.
 */
async function moveGuestPurchaseToAccount(
  refreshProfile: () => Promise<unknown>,
): Promise<void> {
  const key = localStorageKeys.pendingGuestPurchaseMove;
  const attempts = appStorage.getNumber(key) ?? 0;
  const countFailedAttempt = () => {
    if (attempts + 1 >= MAX_PURCHASE_MOVE_ATTEMPTS) {
      appStorage.remove(key);
    } else {
      appStorage.set(key, attempts + 1);
    }
  };

  try {
    if (!usePurchasesStore.getState().hasStoreEntitlement) {
      await restorePremium();
    }
  } catch (error) {
    console.warn("Unable to move the guest purchase to the account", error);

    // Offline is not an answer: keep the full retry budget for next launch.
    if (!isTransientPurchasesError(error)) {
      countFailedAttempt();
    }
    return;
  }

  if (!usePurchasesStore.getState().hasStoreEntitlement) {
    countFailedAttempt();
    return;
  }

  // The purchase is on the account now; activating it needs the server.
  const result = await syncPremiumWithServer();

  if (!result) {
    // Not deployed, timed out or offline: activate on the next launch.
    countFailedAttempt();
    return;
  }

  appStorage.remove(key);

  if (result.userPlan === "PRO") {
    await refreshProfile().catch((error) => {
      console.warn("Unable to reload the profile after the move", error);
    });
  }
}

/**
 * Re-checks a guest's Premium when there is something to check (a stored or
 * expired token, or a store entitlement), renewing a day-old token. Guests
 * who never bought cost no request.
 */
function renewGuestPremium() {
  const { status } = useGuestPremiumStore.getState();

  if (
    status === "active" ||
    status === "checking" ||
    usePurchasesStore.getState().hasStoreEntitlement
  ) {
    return verifyGuestPremium({ renew: true });
  }

  return Promise.resolve(status);
}
