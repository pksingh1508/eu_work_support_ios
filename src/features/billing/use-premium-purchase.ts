import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import { authHref } from "@/features/auth/return-to";
import { BILLING_ROUTE } from "@/features/billing/premium";
import { syncPremiumWithServer, type PremiumSyncResult } from "@/features/billing/premium-sync";
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
import { describePriceStorefront } from "@/features/billing/storefront";
import { haptic } from "@/lib/haptics";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { UserFacingError } from "@/lib/user-facing-error";

export type PurchaseState = "idle" | "purchasing" | "restoring" | "activating" | "syncing";

/**
 * How long to wait for the RevenueCat webhook to flip `user_plan` to PRO when
 * the server could not verify the purchase itself (sync function not deployed
 * yet, or RevenueCat has not received the transaction).
 */
const ACTIVATION_ATTEMPTS = 6;
const ACTIVATION_INTERVAL_MS = 2500;

/** RevenueCat confirmed the purchase, but the server refuses sandbox purchases. */
const SANDBOX_BLOCKED_NOTE =
  "Your purchase is confirmed, but sandbox (test) purchases are not enabled to unlock content on this server yet.";
const ACTIVATION_PENDING_MESSAGE =
  "Your access is being activated and will appear within a few minutes.";

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives the one-time Premium purchase. RevenueCat owns the transaction and
 * Supabase `user_plan` is what unlocks content (RLS), so after a purchase the
 * app asks the server to verify the entitlement with RevenueCat and mirror it
 * (`revenuecat-sync`), falling back to polling the profile for the webhook.
 * The server check matters because RevenueCat sends no webhook event for a
 * purchase it already knows: Apple's free re-download of an owned
 * non-consumable, or a restore that changes nothing.
 *
 * The price shown comes from the loaded offer (RevenueCat → StoreKit →
 * `product.priceString`), never from a hardcoded list price, and `purchase`
 * buys that same offer object. Apple sets that price per App Store
 * storefront (the country of the Apple Account signed into the App Store),
 * so the offer also records which storefront it was priced for and the
 * screen captions the price with it.
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
  /** Why a confirmed App Store purchase is still not active here, when the server said. */
  const [activationNote, setActivationNote] = useState<string | null>(null);

  const priceLabel = offer?.priceString || null;
  const priceRegionNote = offer
    ? describePriceStorefront(offer.storefrontCountryCode, offer.currencyCode)
    : null;
  const isPriceLoading = isAvailable && !offer && offerStatus !== "error";
  const priceError = !offer && offerStatus === "error" ? offerError : null;

  useEffect(() => {
    if (planStatus === "pro") {
      setActivationNote(null);
    }
  }, [planStatus]);

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

  const celebrate = useCallback(() => {
    setActivationNote(null);
    haptic.success();
    showSuccessToast("Welcome to Premium", "Every guide is now unlocked.");
  }, []);

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
    setActivationNote(null);

    // 1. Server-side check: the Edge Function asks RevenueCat whether this
    //    account holds the entitlement and mirrors the answer into Supabase.
    //    Works for every confirmed purchase, including the ones RevenueCat
    //    sends no webhook event for.
    const sync = await syncPremiumWithServer();

    if (sync?.userPlan === "PRO") {
      const profile = await refreshProfile();

      if (profile?.userPlan === "PRO") {
        celebrate();
        return;
      }
    }

    if (sync?.ignored) {
      setActivationNote(SANDBOX_BLOCKED_NOTE);
      showInfoToast("Payment received", SANDBOX_BLOCKED_NOTE);
      return;
    }

    // 2. Fallback: wait for the webhook to flip the plan.
    if (await waitForActivation()) {
      celebrate();
      return;
    }

    showInfoToast("Payment received", ACTIVATION_PENDING_MESSAGE);
  }, [celebrate, refreshProfile, waitForActivation]);

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

  /**
   * "Already paid? Refresh status": re-checks the App Store account, asks the
   * server to verify with RevenueCat, then reloads the profile and says what
   * it found.
   */
  const refreshPlan = useCallback(async () => {
    if (state !== "idle") {
      return;
    }

    setState("syncing");

    try {
      let sync: PremiumSyncResult | null = null;

      if (isAvailable && isSignedIn && userId) {
        try {
          await syncPurchasesUser(userId);
          await refreshCustomerInfo();
        } catch (error) {
          console.warn("Unable to refresh purchases", error);
        }

        sync = await syncPremiumWithServer();
      }

      const profile = await refreshProfile();

      if (profile?.userPlan === "PRO") {
        setActivationNote(null);
        haptic.success();
        showSuccessToast("Premium is active", "Every guide is unlocked on this account.");
        return;
      }

      if (sync?.ignored) {
        setActivationNote(SANDBOX_BLOCKED_NOTE);
        showInfoToast("Sandbox purchase found", SANDBOX_BLOCKED_NOTE);
        return;
      }

      if (sync && !sync.entitlementActive && !hasStoreEntitlement) {
        showInfoToast(
          "No purchase found",
          "No Premium purchase is linked to this account. If you bought it with this App Store account, tap Restore purchase.",
        );
        return;
      }

      showInfoToast("Not active yet", "Your plan has not been updated yet. Please try again in a moment.");
    } finally {
      setState("idle");
    }
  }, [hasStoreEntitlement, isAvailable, isSignedIn, refreshProfile, state, userId]);

  return {
    planStatus,
    isSignedIn,
    isAvailable,
    /** Purchase exists on the App Store account but Supabase has not caught up. */
    isAwaitingActivation: hasStoreEntitlement && planStatus === "free",
    /** Server-provided reason the purchase is not active yet, if it gave one. */
    activationNote,
    /** Apple's localised price of the offer `purchase` buys; null until loaded. */
    priceLabel,
    /** Which App Store storefront (country) and currency `priceLabel` belongs to. */
    priceRegionNote,
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
