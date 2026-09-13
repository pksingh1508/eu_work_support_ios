import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { useAuthAccess } from "@/features/auth/access";
import { authHref } from "@/features/auth/return-to";
import {
  BILLING_ROUTE,
  getGatedFeatureCopy,
  type GatedFeature,
} from "@/features/billing/premium";
import { haptic } from "@/lib/haptics";

/**
 * Plan-aware helpers for actions that need Premium. `requirePremium` returns
 * true when the action may proceed; otherwise it has already shown the right
 * prompt (log in, or the Free-plan alert with a "Buy Premium" action).
 */
export function usePremiumGate() {
  const router = useRouter();
  const { planStatus, isSignedIn, userId, isPlanUnavailable, refreshProfile } =
    useAuthAccess();

  const openBilling = useCallback(() => {
    router.push(BILLING_ROUTE);
  }, [router]);

  const showPremiumRequired = useCallback(
    (feature: GatedFeature, subject?: string | null) => {
      const { title, message } = getGatedFeatureCopy(feature, subject);
      haptic.warning();

      Alert.alert(title, message, [
        { text: "Not now", style: "cancel" },
        { text: "Buy Premium", isPreferred: true, onPress: openBilling },
      ]);
    },
    [openBilling],
  );

  const requirePremium = useCallback(
    (feature: GatedFeature, returnTo?: string) => {
      if (!isSignedIn || !userId) {
        router.push(authHref("/sign-in", returnTo));
        return false;
      }

      if (planStatus === "pro") {
        return true;
      }

      if (planStatus === "free") {
        showPremiumRequired(feature);
      } else if (isPlanUnavailable) {
        Alert.alert(
          "Unable to check your plan",
          "Check your connection and try again.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Try again", isPreferred: true, onPress: () => void refreshProfile() },
          ],
        );
      }

      return false;
    },
    [isPlanUnavailable, isSignedIn, planStatus, refreshProfile, router, showPremiumRequired, userId],
  );

  return {
    planStatus,
    isPremium: planStatus === "pro",
    isFreePlan: planStatus === "free",
    /** The plan check failed or timed out; `retryPlanCheck` reloads it. */
    isPlanUnavailable,
    retryPlanCheck: refreshProfile,
    openBilling,
    showPremiumRequired,
    requirePremium,
  };
}
