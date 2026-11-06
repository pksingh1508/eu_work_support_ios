import { useUser } from "@clerk/expo";
import Constants from "expo-constants";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import { StyleSheet } from "react-native";

import { NativeList } from "@/components/ui/native-list";
import type { NativeListRow, NativeListSection } from "@/components/ui/native-list.types";
import { Screen } from "@/components/ui/screen";
import { LoadingState } from "@/components/ui/state-views";
import { TabScreen } from "@/components/ui/tab-screen";
import { useAuthAccess } from "@/features/auth/access";
import { authHref } from "@/features/auth/return-to";
import { usePremiumPriceLabel } from "@/features/billing/purchases";
import { useSavedStore } from "@/features/saved/saved-store";
import { useTheme } from "@/hooks/use-theme";

/**
 * Members see their account; guests (no account) see the same settings,
 * Premium and information rows plus an optional invitation to create an
 * account, which only adds Premium and saves on their other devices.
 */
export function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useUser();
  const {
    isAuthLoaded,
    isGuest,
    planStatus,
    isPlanUnavailable,
    profile,
    userPlan,
    refreshProfile,
  } = useAuthAccess();
  const savedCount = useSavedStore(
    (state) => state.countries.length + state.documents.length,
  );

  const email = profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const databaseName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fullName = databaseName || user?.fullName || user?.firstName || "Welcome";
  const isPro = isGuest ? planStatus === "pro" : userPlan === "PRO";
  // A guest's purchase is still being confirmed (or could not be): neither
  // Premium nor Free yet.
  const isGuestPlanPending = isGuest && planStatus === "unknown";
  const priceLabel = usePremiumPriceLabel();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        void refreshProfile();
      }
    }, [isGuest, refreshProfile]),
  );

  const go = (href: Href) => () => router.push(href);

  if (!isAuthLoaded) {
    return (
      <TabScreen>
        <Screen nativeHeader contentContainerStyle={styles.loading}>
          <LoadingState />
        </Screen>
      </TabScreen>
    );
  }

  const premiumValue = isPro
    ? "Active"
    : isGuestPlanPending
      ? isPlanUnavailable
        ? "Retry"
        : "Checking…"
      : (priceLabel ?? undefined);

  const appRows: NativeListRow[] = [
    {
      key: "premium",
      title: "Premium",
      icon: isPro ? "crownFill" : "crown",
      iconColor: isPro ? colors.success : colors.tertiary,
      value: premiumValue,
      onPress: go("/billing"),
    },
    { key: "settings", title: "Settings", icon: "settings", onPress: go("/profile/settings") },
    {
      key: "saved",
      title: "Saved Guides",
      icon: "bookmark",
      value: savedCount > 0 ? `${savedCount}` : undefined,
      onPress: go("/saved"),
    },
  ];

  const informationSection: NativeListSection = {
    key: "information",
    title: "Information",
    rows: [
      { key: "legal", title: "Legal", icon: "legal", onPress: go("/profile/legal") },
      {
        key: "sources",
        title: "Sources and Disclaimer",
        icon: "sources",
        onPress: go("/profile/sources-and-disclaimer"),
      },
      { key: "support", title: "Support", icon: "support", onPress: go("/profile/support") },
      { key: "app-info", title: "App Info", icon: "info", onPress: go("/profile/app-info") },
    ],
  };

  const footnote = `EU Work Support · Version ${version}`;

  if (isGuest) {
    return (
      <TabScreen>
        <Screen nativeHeader padded={false} edges={[]}>
          <NativeList
            identity={{
              name: "Guest",
              detail: isPro
                ? "Premium is unlocked on this device"
                : isGuestPlanPending
                  ? "Checking your Premium purchase"
                  : "No account needed",
              badge: isGuestPlanPending
                ? undefined
                : isPro
                  ? { label: "Premium", icon: "crownFill", color: colors.success }
                  : undefined,
            }}
            sections={[
              {
                key: "account",
                title:
                  planStatus === "free"
                    ? "Create a free account (optional)"
                    : "Use Premium on all your devices",
                footer:
                  planStatus === "free"
                    ? "Everything in the app works without an account, including buying Premium. An account only lets you use Premium and your saved guides on your other devices."
                    : "Premium is yours on this device, no account needed. Create a free account, or log in, to also use it and your saved guides on your other devices.",
                rows: [
                  {
                    key: "sign-up",
                    title: "Create Free Account",
                    icon: "personAdd",
                    onPress: go(authHref("/sign-up", "/profile")),
                  },
                  {
                    key: "sign-in",
                    title: "Log In",
                    icon: "signIn",
                    onPress: go(authHref("/sign-in", "/profile")),
                  },
                ],
              },
              { key: "app", title: "Your app", rows: appRows },
              informationSection,
            ]}
            footnote={footnote}
          />
        </Screen>
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <Screen nativeHeader padded={false} edges={[]}>
        <NativeList
          identity={{
            name: fullName,
            detail: email || undefined,
            badge: isPro
              ? { label: "Pro member", icon: "crownFill", color: colors.success }
              : { label: "Free plan", icon: "person", color: colors.textSecondary },
            onPress: go("/profile/account"),
          }}
          sections={[
            {
              key: "account",
              title: "Your account",
              rows: [
                ...appRows,
              ],
            },
            informationSection,
            {
              key: "danger",
              rows: [
                {
                  key: "delete",
                  title: "Delete Account",
                  icon: "trash",
                  destructive: true,
                  onPress: go("/profile/danger-zone"),
                },
              ],
            },
          ]}
          footnote={footnote}
        />
      </Screen>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    justifyContent: "center",
  },
});
