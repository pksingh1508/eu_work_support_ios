import { Stack, useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { Screen } from "@/components/ui/screen";
import { Surface, type SurfaceTone } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  headerTitle?: string;
  backIcon?: IconName;
  error?: string | null;
}>;

/**
 * Shared scaffold for the auth modal screens.
 */
export function AuthLayout({
  title,
  subtitle,
  headerTitle = title,
  backIcon = "chevronLeft",
  error,
  children,
}: AuthLayoutProps) {
  const router = useRouter();

  return (
    <Screen nativeHeader scroll keyboard contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: headerTitle }} />
      {/* Modal root: the system close button. Pushed steps keep the native back button. */}
      {backIcon === "close" ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="xmark"
            accessibilityLabel="Close"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
        </Stack.Toolbar>
      ) : null}
      <Entrance from="none">
        <AppText variant="title1">{title}</AppText>
        <AppText variant="body" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </AppText>
      </Entrance>

      {error ? (
        <Entrance style={styles.notice}>
          <AuthNotice tone="error" icon="alert" text={error} />
        </Entrance>
      ) : null}

      <Entrance delay={60} style={styles.form}>
        <Surface>
          <View style={styles.fields}>{children}</View>
        </Surface>
      </Entrance>

      <AppText variant="caption" color="textTertiary" align="center" style={styles.legal}>
        By continuing, you agree to the{" "}
        <AppText
          variant="caption"
          color="primary"
          accessibilityRole="link"
          onPress={() => router.push("/profile/legal/terms-and-conditions")}
        >
          Terms
        </AppText>{" "}
        and{" "}
        <AppText
          variant="caption"
          color="primary"
          accessibilityRole="link"
          onPress={() => router.push("/profile/legal/privacy-policy")}
        >
          Privacy Policy
        </AppText>
        .
      </AppText>
    </Screen>
  );
}

type AuthNoticeProps = {
  tone: SurfaceTone;
  icon: IconName;
  text: string;
};

export function AuthNotice({ tone, icon, text }: AuthNoticeProps) {
  const { colors } = useTheme();
  const iconColor = tone === "error" ? colors.error : colors.primary;

  return (
    <Surface tone={tone} padding="lg" style={styles.noticeRow}>
      <Icon name={icon} size={20} color={iconColor} />
      <AppText
        variant="callout"
        color={tone === "error" ? "error" : "text"}
        style={styles.noticeText}
      >
        {text}
      </AppText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.md,
  },
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
  legal: {
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  noticeText: {
    flex: 1,
    minWidth: 0,
  },
});
