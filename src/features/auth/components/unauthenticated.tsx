import { usePathname, useRouter, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { IconBadge } from "@/components/ui/icon-badge";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";

type UnAuthenticatedProps = {
  title?: string;
  message?: string;
  returnTo?: string;
};

export function UnAuthenticated({
  title = "Log in to continue",
  message = "Use the email associated with your EU Work Support account. Country guides, search and saved items are available to members.",
  returnTo,
}: UnAuthenticatedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const nextReturnTo = returnTo ?? pathname;

  const openLogin = () => {
    router.push({ pathname: "/sign-in", params: { returnTo: nextReturnTo } });
  };

  const openRequestAccess = () => {
    router.push(`/verify?returnTo=${encodeURIComponent(nextReturnTo)}` as Href);
  };

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
            <AppButton label="Log in" icon="signIn" onPress={openLogin} />
            <AppButton
              label="Request access"
              icon="mail"
              variant="secondary"
              onPress={openRequestAccess}
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
