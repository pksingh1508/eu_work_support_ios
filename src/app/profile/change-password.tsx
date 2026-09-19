import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { Spacing } from "@/constants/theme";
import { AuthNotice } from "@/features/auth/components/auth-layout";
import { AccountGuard } from "@/features/auth/components/account-guard";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { haptic } from "@/lib/haptics";

type PasswordUser = {
  updatePassword: (params: {
    currentPassword: string;
    newPassword: string;
    signOutOfOtherSessions?: boolean;
  }) => Promise<unknown>;
};

export default function ChangePasswordScreen() {
  return (
    <AccountGuard>
      <ChangePasswordContent />
    </AccountGuard>
  );
}

function ChangePasswordContent() {
  const router = useRouter();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword
      ? "Passwords do not match."
      : null;

  const updatePassword = async () => {
    if (isSubmitting) {
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    const passwordUser = user as unknown as PasswordUser | null;

    if (!passwordUser?.updatePassword) {
      setError("Unable to update password for this account.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await passwordUser.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });

      haptic.success();
      Alert.alert("Password updated", "Your password has been changed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (authError) {
      haptic.error();
      setError(getAuthErrorMessage(authError, "Unable to change your password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboard header={<ScreenHeader padded title="Change password" />}>
      <Entrance from="none">
        <AppText variant="title2">Update your password</AppText>
        <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
          Enter your current password and choose a new secure password. Other
          devices will be signed out.
        </AppText>
      </Entrance>

      {error ? (
        <Entrance style={styles.notice}>
          <AuthNotice tone="error" icon="alert" text={error} />
        </Entrance>
      ) : null}

      <Entrance delay={60} style={styles.form}>
        <Surface>
          <View style={styles.fields}>
            <TextField
              label="Current password"
              icon="lock"
              secureToggle
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              placeholder="Current password"
            />
            <TextField
              label="New password"
              icon="key"
              secureToggle
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="At least 8 characters"
            />
            <TextField
              label="Confirm new password"
              icon="key"
              secureToggle
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Repeat the new password"
              error={mismatch}
              returnKeyType="done"
              onSubmitEditing={updatePassword}
            />
            <AppButton
              label="Change password"
              icon="shield"
              loading={isSubmitting}
              disabled={
                !currentPassword || !newPassword || !confirmPassword || Boolean(mismatch)
              }
              onPress={updatePassword}
              style={styles.submit}
            />
          </View>
        </Surface>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: Spacing.sm,
  },
  notice: {
    marginTop: Spacing.xl,
  },
  form: {
    marginTop: Spacing.xl,
  },
  fields: {
    gap: Spacing.lg,
  },
  submit: {
    marginTop: Spacing.xs,
  },
});
