import { useEffect } from "react";

import { useAuthAccess } from "@/features/auth/access";
import { prefetchPremiumOffer, syncPurchasesUser } from "@/features/billing/purchases";

/**
 * Configures RevenueCat at launch and keeps its app user id in step with the
 * Clerk session (login → `Purchases.logIn`, sign-out → `Purchases.logOut`).
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
      .then(() => prefetchPremiumOffer())
      .catch((error) => {
        console.warn("Unable to sync the purchases user", error);
      });
  }, [email, isAuthLoaded, userId]);

  return null;
}
