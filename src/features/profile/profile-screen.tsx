import { useUser } from "@clerk/expo";
import Constants from "expo-constants";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Entrance } from "@/components/ui/entrance";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { LoadingState } from "@/components/ui/state-views";
import { Surface } from "@/components/ui/surface";
import { TabScreen } from "@/components/ui/tab-screen";
import { Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { OptionalAccountCard } from "@/features/auth/components/optional-account-card";
import { usePremiumPriceLabel } from "@/features/billing/purchases";
import { useSavedStore } from "@/features/saved/saved-store";

/**
 * Members see their account; guests (no account) see the same settings,
 * Premium and information rows plus an optional invitation to create an
 * account, which only adds Premium and saves on their other devices.
 */
export function ProfileScreen() {
  const router = useRouter();
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
  const imageUrl = profile?.imageUrl ?? user?.imageUrl ?? null;
  const isPro = isGuest ? planStatus === "pro" : userPlan === "PRO";
  // A guest's purchase is still being confirmed (or could not be): neither
  // Premium nor Free yet.
  const isGuestPlanPending = isGuest && planStatus === "unknown";
  const priceLabel = usePremiumPriceLabel();
  const premiumSubtitle = isPro
    ? "Lifetime access active"
    : isGuestPlanPending
      ? isPlanUnavailable
        ? "Couldn't confirm your purchase · open to try again"
        : "Checking your purchase…"
      : priceLabel
        ? `Unlock everything · ${priceLabel} one-time`
        : "Unlock everything · one-time purchase";
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
        <Screen contentContainerStyle={styles.loading}>
          <LoadingState />
        </Screen>
      </TabScreen>
    );
  }

  const informationGroup = (
    <ListGroup title="Information">
      <ListRow icon="legal" title="Legal" onPress={go("/profile/legal")} />
      <ListRow
        icon="sources"
        title="Sources and disclaimer"
        onPress={go("/profile/sources-and-disclaimer")}
      />
      <ListRow icon="support" title="Support" onPress={go("/profile/support")} />
      <ListRow icon="info" title="App info" onPress={go("/profile/app-info")} />
    </ListGroup>
  );
  const premiumRow = (
    <ListRow
      icon="crown"
      iconTone={isPro ? "success" : "tertiary"}
      title="Premium"
      subtitle={premiumSubtitle}
      onPress={go("/billing")}
    />
  );
  const settingsRow = (
    <ListRow
      icon="settings"
      title="Settings"
      subtitle="Appearance, help and legal"
      onPress={go("/profile/settings")}
    />
  );
  const savedRow = (
    <ListRow
      icon="bookmark"
      title="Saved guides"
      subtitle={
        savedCount > 0
          ? `${savedCount} saved ${savedCount === 1 ? "item" : "items"}`
          : "Countries and guides you bookmark"
      }
      onPress={go("/saved")}
    />
  );

  if (isGuest) {
    return (
      <TabScreen>
        <Screen scroll contentContainerStyle={styles.content}>
          <Entrance from="none">
            <AppText variant="display">Profile</AppText>
          </Entrance>

          <Entrance index={1} style={styles.section}>
            <Surface style={styles.identity}>
              <Avatar name="Guest" imageUrl={null} size={72} />
              <View style={styles.identityText}>
                <AppText variant="title2" numberOfLines={1}>
                  Guest
                </AppText>
                <AppText variant="footnote" color="textSecondary" numberOfLines={2}>
                  {isPro
                    ? "Premium is unlocked on this device"
                    : isGuestPlanPending
                      ? "Checking your Premium purchase"
                      : "No account needed"}
                </AppText>
                {isGuestPlanPending ? null : (
                  <Chip
                    label={isPro ? "Premium" : "Free plan"}
                    icon={isPro ? "crown" : "person"}
                    tone={isPro ? "success" : "neutral"}
                    style={styles.planChip}
                  />
                )}
              </View>
            </Surface>
          </Entrance>

          <Entrance index={2} style={styles.section}>
            <OptionalAccountCard
              returnTo="/profile"
              title={
                planStatus === "free"
                  ? "Create a free account (optional)"
                  : "Use Premium on all your devices"
              }
              message={
                planStatus === "free"
                  ? "Everything in the app works without an account, including buying Premium. An account only lets you use Premium and your saved guides on your other devices."
                  : "Premium is yours on this device, no account needed. Create a free account, or log in, to also use it and your saved guides on your other devices. You can do this any time."
              }
            />
          </Entrance>

          <Entrance index={3} style={styles.section}>
            <ListGroup title="Your app">
              {premiumRow}
              {settingsRow}
              {savedRow}
            </ListGroup>
          </Entrance>

          <Entrance index={4} style={styles.section}>
            {informationGroup}
          </Entrance>

          <AppText variant="caption" color="textTertiary" align="center" style={styles.version}>
            EU Work Support · Version {version}
          </AppText>
        </Screen>
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <Screen scroll contentContainerStyle={styles.content}>
        <Entrance from="none">
          <AppText variant="display">Profile</AppText>
        </Entrance>

        <Entrance index={1} style={styles.section}>
          <Surface style={styles.identity}>
            <Avatar name={fullName} imageUrl={imageUrl} size={72} />
            <View style={styles.identityText}>
              <AppText variant="title2" numberOfLines={1}>
                {fullName}
              </AppText>
              {email ? (
                <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
                  {email}
                </AppText>
              ) : null}
              <Chip
                label={isPro ? "Pro member" : "Free plan"}
                icon={isPro ? "crown" : "person"}
                tone={isPro ? "success" : "neutral"}
                style={styles.planChip}
              />
            </View>
            <IconButton
              icon="edit"
              variant="tonal"
              size={40}
              iconSize={18}
              accessibilityLabel="Edit profile"
              onPress={go("/profile/edit")}
            />
          </Surface>
        </Entrance>

        <Entrance index={2} style={styles.section}>
          <ListGroup title="Your account">
            <ListRow
              icon="person"
              title="Account"
              subtitle="Profile details, password, sign out"
              onPress={go("/profile/account")}
            />
            {premiumRow}
            {settingsRow}
            {savedRow}
          </ListGroup>
        </Entrance>

        <Entrance index={3} style={styles.section}>
          {informationGroup}
        </Entrance>

        <Entrance index={4} style={styles.section}>
          <ListGroup title="Danger zone">
            <ListRow
              icon="trash"
              tone="danger"
              title="Delete account"
              subtitle="Permanently remove your account and data"
              onPress={go("/profile/danger-zone")}
            />
          </ListGroup>
        </Entrance>

        <AppText variant="caption" color="textTertiary" align="center" style={styles.version}>
          EU Work Support · Version {version}
        </AppText>
      </Screen>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
  },
  loading: {
    justifyContent: "center",
  },
  section: {
    marginTop: Spacing.xxl,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  planChip: {
    marginTop: Spacing.sm,
  },
  version: {
    marginTop: Spacing.xxxl,
  },
});
