import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import type { IconWeight } from "@/components/ui/icon.types";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Layout } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { HapticKind } from "@/lib/haptics";

export type IconButtonVariant =
  | "glass"
  | "tonal"
  | "filled"
  | "plain"
  | "success"
  | "danger";

export type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: number;
  iconSize?: number;
  iconColor?: string;
  weight?: IconWeight;
  disabled?: boolean;
  haptic?: HapticKind | "none";
  style?: StyleProp<ViewStyle>;
};

/**
 * 44pt circular button used for navigation and toggles.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "tonal",
  size = Layout.headerButtonSize,
  iconSize,
  iconColor,
  weight = "semibold",
  disabled = false,
  haptic = "light",
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const resolvedIconSize = iconSize ?? Math.round(size * 0.45);

  const palette = {
    glass: { background: "transparent", icon: colors.text },
    tonal: { background: colors.surfaceHigh, icon: colors.primary },
    filled: { background: colors.primary, icon: colors.onPrimary },
    plain: { background: "transparent", icon: colors.text },
    success: { background: colors.successSoft, icon: colors.success },
    danger: { background: colors.errorSoft, icon: colors.error },
  }[variant];

  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const iconElement = (
    <Icon
      name={icon}
      size={resolvedIconSize}
      color={iconColor ?? palette.icon}
      weight={weight}
    />
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      haptic={haptic}
      hitSlop={Layout.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[shape, disabled ? styles.disabled : null, style]}
    >
      {variant === "glass" ? (
        <GlassSurface interactive style={[shape, styles.center]}>
          {iconElement}
        </GlassSurface>
      ) : (
        <View
          style={[shape, styles.center, { backgroundColor: palette.background }]}
        >
          {iconElement}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
