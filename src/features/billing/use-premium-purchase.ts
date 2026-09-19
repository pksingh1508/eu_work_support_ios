import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import {
  useGuestPremiumStore,
  verifyGuestPremium,
  type GuestPremiumStatus,
} from "@/features/billing/guest-premium";
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
/** The guest check could not reach the server; the purchase itself is safe. */
const GUEST_PENDING_MESSAGE =
  "We could not confirm it with our server yet. Tap “Already paid? Refresh status” in a moment.";
/** A new purchase can take a moment to show up in RevenueCat's API. */
const GUEST_ACTIVATION_ATTEMPTS = 3;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives the one-time Premium purchase. No account is needed to buy or
 * restore (App Store Review Guideline 5.1.1(v)); an account is optional and
 * only makes Premium available on the person's other devices.
 *
 * RevenueCat owns the transaction. For members, Supabase `user_plan` is what
 * unlocks content (RLS), so after a purchase the app asks the server to
 * verify the entitlement with RevenueCat and mirror it (`revenuecat-sync`),
 * falling back to polling the profile for the webhook. The server check
 * matters because RevenueCat sends no webhook event for a purchase it already
 * knows: Apple's free re-download of an owned non-consumable, or a restore
 * that changes nothing. For guests, `guest-premium` verifies the anonymous
 * purchase with RevenueCat and returns the access token content reads use.
 *
 * The price shown comes from the loaded offer (RevenueCat → StoreKit →
 * `product.priceString`), never from a hardcoded list price, and `purchase`
 * buys that same offer object. Apple sets that price per App Store
 * storefront (the country of the Apple Account signed into the App Store),
 * so the offer also records which storefront it was priced for and the
 * screen captions the price with it.
 */
export function usePremiumPurchase() {
  const {
    isAuthLoaded,
    userId,
    isSignedIn,
    isGuest,
    planStatus,
    isPlanUnavailable,
    refreshProfile,
  } = useAuthAccess();
  const hasStoreEntitlement = usePurchasesStore((state) => state.hasStoreEntitlement);
  const guestStatus = useGuestPremiumStore((state) => state.status);
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

  // A guest's sandbox purchase the server refused, even when it was found at
  // launch rather than just bought.
  useEffect(() => {
    if (isGuest && guestStatus === "ignored") {
      setActivationNote(SANDBOX_BLOCKED_NOTE);
    }
  }, [guestStatus, isGuest]);

  const loadOffer = useCallback(async () => {
    // Until Clerk has loaded, a signed-in member would look like a guest and
    // be logged out of RevenueCat.
    if (!isAvailable || !isAuthLoaded) {
      return;
    }

    try {
      await syncPurchasesUser(userId ?? null);
      await fetchPremiumOffer();
    } catch (error) {
      console.warn("Unable to load the Premium offer", error);
      markOfferFailed(error);
    }
  }, [isAuthLoaded, isAvailable, userId]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  const celebrate = useCallback(() => {
    setActivationNote(null);
    haptic.success();
    showSuccessToast(
      "Welcome to Premium",
      isGuest ? "Every guide is now unlocked on this device." : "Every guide is now unlocked.",
    );
  }, [isGuest]);

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

  /**
   * Guests: asks `guest-premium` to confirm the purchase with RevenueCat,
   * retrying briefly in case the new transaction is not visible there yet.
   */
  const verifyGuestUnlock = useCallback(async () => {
    let status: GuestPremiumStatus = "inactive";

    for (let attempt = 0; attempt < GUEST_ACTIVATION_ATTEMPTS; attempt += 1) {
      status = await verifyGuestPremium({ force: true });

      if (status !== "inactive") {
        break;
      }

      await delay(ACTIVATION_INTERVAL_MS);
    }

    return status;
  }, []);

  const finishGuestUnlock = useCallback(async () => {
    setState("activating");
    setActivationNote(null);

    const status = await verifyGuestUnlock();

    if (status === "active") {
      celebrate();
      return;
    }

    if (status === "ignored") {
      setActivationNote(SANDBOX_BLOCKED_NOTE);
      showInfoToast("Payment received", SANDBOX_BLOCKED_NOTE);
      return;
    }

    showInfoToast("Payment received", GUEST_PENDING_MESSAGE);
  }, [celebrate, verifyGuestUnlock]);

  const finishUnlock = useCallback(async () => {
    if (isGuest) {
      await finishGuestUnlock();
      return;
    }

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
  }, [celebrate, finishGuestUnlock, isGuest, refreshProfile, waitForActivation]);

  const explainUnavailable = useCallback(() => {
    Alert.alert(
      "Purchases unavailable",
      "In-app purchases are not enabled in this build yet. Please contact support to upgrade.",
    );
  }, []);

  // No sign-in step: anyone can buy. Guests buy as RevenueCat's anonymous
  // user, members under their Clerk id.
  const purchase = useCallback(async () => {
    if (state !== "idle" || !isAuthLoaded) {
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
  }, [explainUnavailable, finishUnlock, isAuthLoaded, isAvailable, offer, state, userId]);

  const restore = useCallback(async () => {
    if (state !== "idle" || !isAuthLoaded) {
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
  }, [explainUnavailable, finishUnlock, isAuthLoaded, isAvailable, state, userId]);

  /**
   * "Already paid? Refresh status" for guests: re-reads the App Store
   * purchases and asks `guest-premium` to confirm Premium again.
   */
  const refreshGuestPlan = useCallback(async () => {
    if (isAvailable) {
      try {
        await syncPurchasesUser(null);
      } catch (error) {
        console.warn("Unable to refresh purchases", error);
      }
    }

    const status = await verifyGuestPremium({ force: true });

    if (status === "active") {
      setActivationNote(null);
      haptic.success();
      showSuccessToast("Premium is active", "Every guide is unlocked on this device.");
      return;
    }

    if (status === "ignored") {
      setActivationNote(SANDBOX_BLOCKED_NOTE);
      showInfoToast("Sandbox purchase found", SANDBOX_BLOCKED_NOTE);
      return;
    }

    if (status === "error") {
      showInfoToast(
        "Could not check right now",
        "Check your connection and try again in a moment.",
      );
      return;
    }

    showInfoToast(
      "No purchase found",
      "This device's App Store account has no Premium purchase yet. If you bought it before, tap Restore purchase.",
    );
  }, [isAvailable]);

  /**
   * "Already paid? Refresh status": re-checks the App Store account, asks the
   * server to verify with RevenueCat, then reloads the profile (or, for a
   * guest, the purchase check) and says what it found.
   */
  const refreshPlan = useCallback(async () => {
    if (state !== "idle" || !isAuthLoaded) {
      return;
    }

    setState("syncing");

    try {
      if (isGuest) {
        await refreshGuestPlan();
        return;
      }

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
        showSuccessToast("Premium is active", "Every guide is unlocked.");
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
          "We found no Premium purchase for you yet. If you bought it with this device's App Store account, tap Restore purchase.",
        );
        return;
      }

      showInfoToast("Not active yet", "Your plan has not been updated yet. Please try again in a moment.");
    } finally {
      setState("idle");
    }
  }, [
    hasStoreEntitlement,
    isAuthLoaded,
    isAvailable,
    isGuest,
    isSignedIn,
    refreshGuestPlan,
    refreshProfile,
    state,
    userId,
  ]);

  return {
    /** Clerk has loaded, so the buttons know whether this is a guest or a member. */
    isReady: isAuthLoaded,
    planStatus,
    isSignedIn,
    isGuest,
    isAvailable,
    /**
     * The App Store account owns Premium but it is not active here yet:
     * Supabase has not caught up (members) or the server check has not
     * succeeded (guests).
     */
    isAwaitingActivation: hasStoreEntitlement && (planStatus === "free" || isPlanUnavailable),
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
