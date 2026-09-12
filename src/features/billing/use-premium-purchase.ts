import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { useAuthAccess } from "@/features/auth/access";
import { authHref } from "@/features/auth/return-to";
import { BILLING_ROUTE, PREMIUM_PRICE_LABEL } from "@/features/billing/premium";
import {
  ensurePurchasesReady,
  fetchPremiumPackage,
  getPurchaseErrorMessage,
  isPurchaseCancelled,
  isPurchasesAvailable,
  purchasePremium,
  restorePremium,
} from "@/features/billing/purchases";
import { haptic } from "@/lib/haptics";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";

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
  const isAvailable = isPurchasesAvailable();
  const [premiumPackage, setPremiumPackage] = useState<PurchasesPackage | null>(null);
  const [priceLabel, setPriceLabel] = useState(PREMIUM_PRICE_LABEL);
  const [state, setState] = useState<PurchaseState>("idle");

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    let isActive = true;

    (async () => {
      try {
        await ensurePurchasesReady(userId ?? null);
        const nextPackage = await fetchPremiumPackage();

        if (isActive && nextPackage) {
          setPremiumPackage(nextPackage);
          setPriceLabel(nextPackage.product.priceString || PREMIUM_PRICE_LABEL);
        }
      } catch (error) {
        console.warn("Unable to load Premium offering", error);
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
      await ensurePurchasesReady(userId ?? null);
      const target = premiumPackage ?? (await fetchPremiumPackage());

      if (!target) {
        throw new Error("The Premium product is not available right now. Please try again later.");
      }

      const unlocked = await purchasePremium(target);

      if (!unlocked) {
        showErrorToast(
          "Purchase not confirmed",
          "The store did not confirm the purchase. Try restoring in a moment.",
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
  }, [
    ensureSignedIn,
    explainUnavailable,
    finishUnlock,
    isAvailable,
    premiumPackage,
    state,
    userId,
  ]);

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
      await ensurePurchasesReady(userId ?? null);
      const unlocked = await restorePremium();

      if (!unlocked) {
        showInfoToast("Nothing to restore", "No Premium purchase was found for this Apple ID.");
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

  return {
    planStatus,
    isSignedIn,
    isAvailable,
    priceLabel,
    state,
    purchase,
    restore,
    refreshPlan: refreshProfile,
  };
}
