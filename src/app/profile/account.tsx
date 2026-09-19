import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Entrance } from "@/components/ui/entrance";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { AccountGuard } from "@/features/auth/components/account-guard";
import { haptic } from "@/lib/haptics";
import { clearCachedAuthSnapshot } from "@/lib/local-storage";

export default function ProfileAccountScreen() {
  return (
    <AccountGuard>
      <ProfileAccountContent />
    </AccountGuard>
  );
}

function ProfileAccountContent() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { profile } = useAuthAccess();

  const email = profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const databaseName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fullName = databaseName || user?.fullName || user?.firstName || "Welcome";

  const handleSignOut = () => {
    haptic.warning();
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          clearCachedAuthSnapshot();
          await signOut();
        },
      },
    ]);
  };

  return (
    <Screen scroll header={<ScreenHeader padded title="Account" />}>
      <Entrance index={0}>
        <Surface style={styles.identity}>
          <Avatar name={fullName} imageUrl={profile?.imageUrl ?? user?.imageUrl} size={56} />
          <View style={styles.identityText}>
            <AppText variant="title3" numberOfLines={1}>
              {fullName}
            </AppText>
            {email ? (
              <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
                {email}
              </AppText>
            ) : null}
          </View>
        </Surface>
      </Entrance>

      <Entrance index={1} style={styles.section}>
        <ListGroup title="Details">
          <ListRow
            icon="edit"
            title="Edit profile"
            subtitle="Update your first and last name"
            onPress={() => router.push("/profile/edit")}
          />
          <ListRow
            icon="lock"
            title="Change password"
            subtitle="Choose a new secure password"
            onPress={() => router.push("/profile/change-password")}
          />
        </ListGroup>
      </Entrance>

      <Entrance index={2} style={styles.section}>
        <ListGroup title="Session">
          <ListRow
            icon="signOut"
            tone="danger"
            title="Sign out"
            trailing="none"
            onPress={handleSignOut}
          />
        </ListGroup>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  section: {
    marginTop: Spacing.xxl,
  },
});
