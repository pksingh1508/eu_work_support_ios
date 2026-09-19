import { useRouter } from "expo-router";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { authHref } from "@/features/auth/return-to";

type OptionalAccountCardProps = {
  title?: string;
  message?: string;
  /** Where to come back to after signing up or logging in. */
  returnTo?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Invites a guest to create an account, making clear it is optional: an
 * account only makes Premium and saved guides available on their other
 * devices (App Store Review Guideline 5.1.1(v)). Guests can sign up or log in
 * from here at any time.
 */
export function OptionalAccountCard({
  title = "Use Premium on all your devices",
  message = "An account is optional. Create a free account, or log in, to use Premium and your saved guides on your other devices too. You can do this any time.",
  returnTo,
  style,
}: OptionalAccountCardProps) {
  const router = useRouter();

  return (
    <Surface style={[styles.card, style]}>
      <View style={styles.header}>
        <IconBadge icon="device" tone="primary" size={44} iconSize={20} radius="md" />
        <View style={styles.texts}>
          <AppText variant="headline">{title}</AppText>
          <AppText variant="footnote" color="textSecondary">
            {message}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <AppButton
          label="Create free account"
          icon="personAdd"
          size="md"
          onPress={() => router.push(authHref("/sign-up", returnTo))}
        />
        <AppButton
          label="Log in"
          icon="signIn"
          variant="ghost"
          size="md"
          onPress={() => router.push(authHref("/sign-in", returnTo))}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
});
