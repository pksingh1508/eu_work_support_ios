import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ChipTone =
  | "neutral"
  | "primary"
  | "tertiary"
  | "success"
  | "inverse"
  | "dark";

export type ChipProps = {
  label: string;
  icon?: IconName;
  tone?: ChipTone;
  size?: "sm" | "md";
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Small pill for categories, states and metadata.
 */
export function Chip({
  label,
  icon,
  tone = "neutral",
  size = "sm",
  uppercase = false,
  style,
}: ChipProps) {
  const { colors } = useTheme();

  const palette = {
    neutral: { background: colors.surfaceLow, text: colors.textSecondary },
    primary: { background: colors.primarySoft, text: colors.primary },
    tertiary: { background: colors.tertiarySoft, text: colors.tertiary },
    success: { background: colors.successSoft, text: colors.success },
    inverse: { background: colors.heroSurface, text: colors.onHero },
    dark: { background: colors.heroStart, text: colors.onHero },
  }[tone];

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.base,
        isSmall ? styles.small : styles.medium,
        { backgroundColor: palette.background },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={isSmall ? 12 : 14} color={palette.text} />
      ) : null}
      <AppText
        variant={uppercase ? "eyebrow" : isSmall ? "caption" : "label"}
        color={palette.text}
        numberOfLines={1}
        style={uppercase ? styles.eyebrowText : null}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radii.pill,
    gap: Spacing.xs,
  },
  small: {
    paddingHorizontal: Spacing.sm + Spacing.xxs,
    paddingVertical: Spacing.xs + 1,
  },
  medium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 1,
  },
  eyebrowText: {
    letterSpacing: 0.8,
  },
});
