import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import type { IconWeight } from "@/components/ui/icon.types";
import { Radii } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type IconBadgeTone =
  | "neutral"
  | "primary"
  | "tertiary"
  | "success"
  | "danger"
  | "inverse";

export type IconBadgeProps = {
  icon: IconName;
  tone?: IconBadgeTone;
  size?: number;
  iconSize?: number;
  radius?: keyof typeof Radii | "circle";
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
};

/**
 * Icon inside a soft tonal container. Used as the leading element of rows,
 * cards and empty states so iconography reads as one system.
 */
export function IconBadge({
  icon,
  tone = "neutral",
  size = 44,
  iconSize,
  radius = "md",
  weight = "medium",
  style,
}: IconBadgeProps) {
  const { colors } = useTheme();

  const palette = {
    neutral: { background: colors.surfaceLow, icon: colors.text },
    primary: { background: colors.primarySoft, icon: colors.primary },
    tertiary: { background: colors.tertiarySoft, icon: colors.tertiary },
    success: { background: colors.successSoft, icon: colors.success },
    danger: { background: colors.errorSoft, icon: colors.error },
    inverse: { background: colors.heroSurface, icon: colors.onHero },
  }[tone];

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius === "circle" ? size / 2 : Radii[radius],
          backgroundColor: palette.background,
        },
        style,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize ?? Math.round(size * 0.5)}
        color={palette.icon}
        weight={weight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
