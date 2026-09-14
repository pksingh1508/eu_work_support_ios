import { useEffect } from "react";
import { AppState } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import { ensurePremiumOffer, syncPurchasesUser } from "@/features/billing/purchases";

/**
 * Configures RevenueCat at launch and keeps its app user id in step with the
 * Clerk session (login → `Purchases.logIn`, sign-out → `Purchases.logOut`).
 *
 * Also keeps the Premium price in step with the App Store storefront, the
 * country Apple prices for: the storefront is read from StoreKit at launch
 * and every time the app returns to the foreground, and a change (another
 * Apple Account, or the same account moved to another country) reloads the
 * offer so no screen keeps showing a price from the previous storefront.
 * Renders nothing.
 */
export function PurchasesBridge() {
  const { isAuthLoaded, userId, profile } = useAuthAccess();
  const email = profile?.email ?? null;

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

  return null;
}
