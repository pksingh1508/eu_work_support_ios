import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import { authHref } from "@/features/auth/return-to";
import { BILLING_ROUTE } from "@/features/billing/premium";
import {
  OFFER_UNAVAILABLE_MESSAGE,
  fetchPremiumOffer,
  getPurchaseErrorMessage,
  isPurchaseCancelled,
  isPurchasesAvailable,
  markOfferFailed,
  purchasePremium,
  refreshCustomerInfo,
  restorePremium,
  syncPurchasesUser,
  usePurchasesStore,
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
 *
 * The price shown comes from the loaded offer (RevenueCat → StoreKit →
 * `product.priceString`), never from a hardcoded list price, and `purchase`
 * buys that same offer object.
 */
export function usePremiumPurchase() {
  const router = useRouter();
  const { userId, isSignedIn, planStatus, refreshProfile } = useAuthAccess();
  const hasStoreEntitlement = usePurchasesStore((state) => state.hasStoreEntitlement);
  const offer = usePurchasesStore((state) => state.offer);
  const offerStatus = usePurchasesStore((state) => state.offerStatus);
  const offerError = usePurchasesStore((state) => state.offerError);
  const isAvailable = isPurchasesAvailable();
  const [state, setState] = useState<PurchaseState>("idle");

  const priceLabel = offer?.priceString || null;
  const isPriceLoading = isAvailable && !offer && offerStatus !== "error";
  const priceError = !offer && offerStatus === "error" ? offerError : null;

  const loadOffer = useCallback(async () => {
    if (!isAvailable) {
      return;
    }

    try {
      await syncPurchasesUser(userId ?? null);
      await fetchPremiumOffer();
    } catch (error) {
      console.warn("Unable to load the Premium offer", error);
      markOfferFailed(error);
    }
  }, [isAvailable, userId]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

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
      // Buy the very offer whose price is on screen; fetch only if none loaded yet.
      const target = offer ?? (await fetchPremiumOffer());

      if (!target) {
        throw new UserFacingError(OFFER_UNAVAILABLE_MESSAGE);
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
    /** Apple's localised price of the offer `purchase` buys; null until loaded. */
    priceLabel,
    /** True while the store price is still being fetched. */
    isPriceLoading,
    /** Why the price could not be loaded, once loading has failed. */
    priceError,
    reloadPrice: loadOffer,
    state,
    purchase,
    restore,
    refreshPlan,
  };
}
