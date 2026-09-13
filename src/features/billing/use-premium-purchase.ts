import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import { authHref } from "@/features/auth/return-to";
import { BILLING_ROUTE, PREMIUM_PRICE_LABEL } from "@/features/billing/premium";
import {
  fetchPremiumOffer,
  getPurchaseErrorMessage,
  isPurchaseCancelled,
  isPurchasesAvailable,
  purchasePremium,
  refreshCustomerInfo,
  restorePremium,
  syncPurchasesUser,
  usePremiumPriceLabel,
  usePurchasesStore,
  type PremiumOffer,
} from "@/features/billing/purchases";
import { haptic } from "@/lib/haptics";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { UserFacingError } from "@/lib/user-facing-error";

export type PurchaseState = "idle" | "purchasing" | "restoring" | "activating";

/** How long to wait for the RevenueCat webhook to flip `user_plan` to PRO. */
const ACTIVATION_ATTEMPTS = 6;
const ACTIVATION_INTERVAL_MS = 2500;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives the one-time Premium purchase. RevenueCat owns the transaction; the
 * webhook mirrors the entitlement into Supabase, which is what unlocks
 * content (RLS), so after a purchase we poll the profile until it says PRO.
 */
export function usePremiumPurchase() {
  const router = useRouter();
  const { userId, isSignedIn, planStatus, refreshProfile } = useAuthAccess();
  const hasStoreEntitlement = usePurchasesStore((state) => state.hasStoreEntitlement);
  const isAvailable = isPurchasesAvailable();
  const [offer, setOffer] = useState<PremiumOffer | null>(null);
  const storePriceLabel = usePremiumPriceLabel();
  const priceLabel = storePriceLabel ?? PREMIUM_PRICE_LABEL;
  const [state, setState] = useState<PurchaseState>("idle");

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    let isActive = true;

    (async () => {
      try {
        await syncPurchasesUser(userId ?? null);
        const nextOffer = await fetchPremiumOffer();

        if (isActive && nextOffer) {
          setOffer(nextOffer);
        }
      } catch (error) {
        console.warn("Unable to load the Premium offer", error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isAvailable, userId]);

  const waitForActivation = useCallback(async () => {
    for (let attempt = 0; attempt < ACTIVATION_ATTEMPTS; attempt += 1) {
      const profile = await refreshProfile();

      if (profile?.userPlan === "PRO") {
        return true;
      }

      await delay(ACTIVATION_INTERVAL_MS);
    }

    return false;
  }, [refreshProfile]);

  const finishUnlock = useCallback(async () => {
    setState("activating");
    const activated = await waitForActivation();

    if (activated) {
      haptic.success();
      showSuccessToast("Welcome to Premium", "Every guide is now unlocked.");
      return;
    }

    showInfoToast(
      "Payment received",
      "Your access is being activated and will appear within a few minutes.",
    );
  }, [waitForActivation]);

  const ensureSignedIn = useCallback(() => {
    if (isSignedIn && userId) {
      return true;
    }

    router.push(authHref("/sign-in", BILLING_ROUTE));
    return false;
  }, [isSignedIn, router, userId]);

  const explainUnavailable = useCallback(() => {
    Alert.alert(
      "Purchases unavailable",
      "In-app purchases are not enabled in this build yet. Please contact support to upgrade.",
    );
  }, []);

  const purchase = useCallback(async () => {
    if (state !== "idle" || !ensureSignedIn()) {
      return;
    }

    if (!isAvailable) {
      explainUnavailable();
      return;
    }

    setState("purchasing");

    try {
      await syncPurchasesUser(userId ?? null);
      const target = offer ?? (await fetchPremiumOffer());

      if (!target) {
        throw new UserFacingError(
          "The Premium product is not available right now. Please try again later.",
        );
      }

      const unlocked = await purchasePremium(target);

      if (!unlocked) {
        showErrorToast(
          "Purchase not confirmed",
          "The App Store did not confirm the purchase. Try restoring in a moment.",
        );
        return;
      }

      await finishUnlock();
    } catch (error) {
      if (isPurchaseCancelled(error)) {
        return;
      }

      console.warn("Premium purchase failed", error);
      haptic.error();
      showErrorToast(
        "Purchase failed",
        getPurchaseErrorMessage(error, "Something went wrong. Please try again."),
      );
    } finally {
      setState("idle");
    }
  }, [ensureSignedIn, explainUnavailable, finishUnlock, isAvailable, offer, state, userId]);

  const restore = useCallback(async () => {
    if (state !== "idle" || !ensureSignedIn()) {
      return;
    }

    if (!isAvailable) {
      explainUnavailable();
      return;
    }

    setState("restoring");

    try {
      await syncPurchasesUser(userId ?? null);
      const unlocked = await restorePremium();

      if (!unlocked) {
        showInfoToast(
          "Nothing to restore",
          "No Premium purchase was found for this App Store account.",
        );
        return;
      }

      await finishUnlock();
    } catch (error) {
      console.warn("Premium restore failed", error);
      showErrorToast(
        "Restore failed",
        getPurchaseErrorMessage(error, "Something went wrong. Please try again."),
      );
    } finally {
      setState("idle");
    }
  }, [ensureSignedIn, explainUnavailable, finishUnlock, isAvailable, state, userId]);

  const refreshPlan = useCallback(async () => {
    if (isAvailable) {
      refreshCustomerInfo().catch((error) => {
        console.warn("Unable to refresh purchases", error);
      });
    }

    return refreshProfile();
  }, [isAvailable, refreshProfile]);

  return {
    planStatus,
    isSignedIn,
    isAvailable,
    /** Purchase exists on the App Store account but Supabase has not caught up. */
    isAwaitingActivation: hasStoreEntitlement && planStatus === "free",
    priceLabel,
    state,
    purchase,
    restore,
    refreshPlan,
  };
}
