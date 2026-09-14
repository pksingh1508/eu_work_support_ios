import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import { syncPremiumWithServer } from "@/features/billing/premium-sync";
import {
  ensurePremiumOffer,
  syncPurchasesUser,
  usePurchasesStore,
} from "@/features/billing/purchases";

/**
 * Configures RevenueCat at launch and keeps its app user id in step with the
 * Clerk session (login → `Purchases.logIn`, sign-out → `Purchases.logOut`).
 *
 * Also keeps the Premium price in step with the App Store storefront, the
 * country Apple prices for: the storefront is read from StoreKit at launch
 * and every time the app returns to the foreground, and a change (another
 * Apple Account, or the same account moved to another country) reloads the
 * offer so no screen keeps showing a price from the previous storefront.
 *
 * Finally, it self-heals a stuck activation: when the App Store account owns
 * Premium but the Supabase profile still says Free (a webhook event never
 * arrived, or none was ever sent because the purchase was a restore or a
 * re-download), it asks the server once per user to verify with RevenueCat.
 * Renders nothing.
 */
export function PurchasesBridge() {
  const { isAuthLoaded, userId, profile, planStatus, refreshProfile } = useAuthAccess();
  const hasStoreEntitlement = usePurchasesStore((state) => state.hasStoreEntitlement);
  const email = profile?.email ?? null;
  const healedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    syncPurchasesUser(userId ?? null, email)
      .then(() => ensurePremiumOffer())
      .catch((error) => {
        console.warn("Unable to sync the purchases user", error);
      });
  }, [email, isAuthLoaded, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void ensurePremiumOffer();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (
      !userId ||
      planStatus !== "free" ||
      !hasStoreEntitlement ||
      healedUserRef.current === userId
    ) {
      return;
    }

    healedUserRef.current = userId;

    syncPremiumWithServer()
      .then((result) => (result?.userPlan === "PRO" ? refreshProfile() : null))
      .catch((error) => {
        console.warn("Unable to sync the Premium plan", error);
      });
  }, [hasStoreEntitlement, planStatus, refreshProfile, userId]);

  return null;
}
