import { useClerk, useUser } from "@clerk/expo";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { AccountGuard } from "@/features/auth/components/account-guard";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";
import { clearCachedAuthSnapshot } from "@/lib/local-storage";

type DeletableUser = {
  delete: () => Promise<unknown>;
};

const consequences = [
  "Your account and login are removed permanently.",
  "Saved countries and guides are deleted.",
  "You will be signed out on this device immediately.",
];

export default function DangerZoneScreen() {
  return (
    <AccountGuard>
      <DangerZoneContent />
    </AccountGuard>
  );
}

function DangerZoneContent() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = () => {
    haptic.warning();
    Alert.alert(
      "Delete account",
      "This action permanently deletes your account. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const deletableUser = user as unknown as DeletableUser | null;

            if (!deletableUser?.delete) {
              Alert.alert(
                "Unable to delete account",
                "Please contact support to delete this account.",
              );
              return;
            }

            setIsDeleting(true);

            try {
              await deletableUser.delete();
              clearCachedAuthSnapshot();
              await signOut();
            } catch (error) {
              console.warn("Unable to delete account", error);
              Alert.alert(
                "Unable to delete account",
                "Please try again or contact support.",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen scroll header={<ScreenHeader padded title="Danger zone" />}>
      <Entrance>
        <Surface tone="error">
          <IconBadge icon="warning" tone="danger" size={52} radius="md" />
          <AppText variant="title2" style={styles.title}>
            Delete account
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.body}>
            Permanently remove your account and sign out of EU Work Support.
            This cannot be undone.
          </AppText>

          <View style={styles.list}>
            {consequences.map((item) => (
              <View key={item} style={styles.item}>
                <Icon name="closeCircle" size={18} color={colors.error} />
                <AppText variant="subhead" color="textSecondary" style={styles.itemText}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>

          <AppButton
            label="Delete account"
            icon="trash"
            variant="destructive"
            loading={isDeleting}
            haptic="none"
            onPress={deleteAccount}
            style={styles.button}
          />
        </Surface>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: Spacing.lg,
  },
  body: {
    marginTop: Spacing.sm,
  },
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  button: {
    marginTop: Spacing.xxl,
  },
});
