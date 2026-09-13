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
import { Surface } from "@/components/ui/surface";
import { TabScreen } from "@/components/ui/tab-screen";
import { Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { usePremiumPriceLabel } from "@/features/billing/purchases";
import { useSavedStore } from "@/features/saved/saved-store";

export function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { profile, userPlan, refreshProfile } = useAuthAccess();
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
  const isPro = userPlan === "PRO";
  const priceLabel = usePremiumPriceLabel();
  const premiumSubtitle = isPro
    ? "Lifetime access active"
    : priceLabel
      ? `Unlock everything · ${priceLabel} one-time`
      : "Unlock everything · one-time purchase";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile]),
  );

  const go = (href: Href) => () => router.push(href);

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
            <ListRow
              icon="crown"
              iconTone={isPro ? "success" : "tertiary"}
              title="Premium"
              subtitle={premiumSubtitle}
              onPress={go("/billing")}
            />
            <ListRow
              icon="settings"
              title="Settings"
              subtitle="Appearance, help and legal"
              onPress={go("/profile/settings")}
            />
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
          </ListGroup>
        </Entrance>

        <Entrance index={3} style={styles.section}>
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
