import { usePathname, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { IconBadge } from "@/components/ui/icon-badge";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { authHref } from "@/features/auth/return-to";

type UnAuthenticatedProps = {
  title?: string;
  message?: string;
  returnTo?: string;
};

export function UnAuthenticated({
  title = "Log in to continue",
  message = "Country guides, search and saved items are available to members. Log in or create a free account to get started.",
  returnTo,
}: UnAuthenticatedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const nextReturnTo = returnTo ?? pathname;

  return (
    <Screen contentContainerStyle={styles.center}>
      <Entrance>
        <Surface style={styles.card}>
          <IconBadge icon="lock" tone="primary" size={64} radius="lg" />
          <AppText variant="title1" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.message}>
            {message}
          </AppText>
          <View style={styles.actions}>
            <AppButton
              label="Log in"
              icon="signIn"
              onPress={() => router.push(authHref("/sign-in", nextReturnTo))}
            />
            <AppButton
              label="Sign up"
              icon="personAdd"
              variant="secondary"
              onPress={() => router.push(authHref("/sign-up", nextReturnTo))}
            />
          </View>
        </Surface>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    paddingBottom: Spacing.giant,
  },
  card: {
    padding: Spacing.xxl,
  },
  title: {
    marginTop: Spacing.xl,
  },
  message: {
    marginTop: Spacing.md,
  },
  actions: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
});
