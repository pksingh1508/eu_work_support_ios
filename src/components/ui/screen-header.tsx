import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { Layout, Spacing } from "@/constants/theme";

export type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: ReactNode;
  /** `inline` centres the title beside the back button, `large` stacks it below. */
  variant?: "inline" | "large";
  style?: StyleProp<ViewStyle>;
};

/**
 * Custom navigation header shared by every stack screen.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  right,
  variant = "inline",
  style,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const backButton = showBack ? (
    <IconButton
      icon="chevronLeft"
      variant="glass"
      accessibilityLabel="Go back"
      onPress={handleBack}
    />
  ) : (
    <View style={styles.spacer} />
  );

  const rightSlot = right ?? <View style={styles.spacer} />;

  if (variant === "large") {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.row}>
          {backButton}
          {rightSlot}
        </View>
        {title ? (
          <AppText variant="title1" style={styles.largeTitle}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {backButton}
        <View style={styles.titleWrap}>
          {title ? (
            <AppText variant="title3" align="center" numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
        </View>
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: Layout.headerButtonSize,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: Spacing.md,
  },
  spacer: {
    width: Layout.headerButtonSize,
    height: Layout.headerButtonSize,
  },
  largeTitle: {
    marginTop: Spacing.xl,
  },
  subtitle: {
    marginTop: Spacing.sm,
  },
});
