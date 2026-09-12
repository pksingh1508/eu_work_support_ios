import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Radii, Spacing } from "@/constants/theme";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/use-theme";
import type { HapticKind } from "@/lib/haptics";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive";

export type AppButtonSize = "lg" | "md" | "sm";

export type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  icon?: IconName;
  iconPosition?: "leading" | "trailing";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: HapticKind | "none";
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const sizeStyles: Record<
  AppButtonSize,
  { height: number; paddingHorizontal: number; radius: number; icon: number }
> = {
  lg: { height: 56, paddingHorizontal: Spacing.xxl, radius: Radii.xl, icon: 20 },
  md: { height: 48, paddingHorizontal: Spacing.xl, radius: Radii.lg, icon: 18 },
  sm: { height: 40, paddingHorizontal: Spacing.lg, radius: Radii.pill, icon: 16 },
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  iconPosition = "leading",
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = "light",
  accessibilityLabel,
  style,
}: AppButtonProps) {
  const { colors } = useTheme();
  const metrics = sizeStyles[size];
  const isInactive = disabled || loading;

  const palette = {
    primary: { background: "transparent", text: colors.onPrimary },
    secondary: { background: colors.surfaceHigh, text: colors.primary },
    ghost: { background: "transparent", text: colors.primary },
    outline: { background: "transparent", text: colors.text },
    destructive: { background: colors.error, text: colors.onPrimary },
  }[variant];

  const content = (
    <>
      {icon && iconPosition === "leading" ? (
        <Icon name={icon} size={metrics.icon} color={palette.text} />
      ) : null}
      <AppText
        variant={size === "lg" ? "button" : "buttonSmall"}
        color={palette.text}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {icon && iconPosition === "trailing" ? (
        <Icon name={icon} size={metrics.icon} color={palette.text} />
      ) : null}
    </>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={isInactive}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        styles.base,
        {
          height: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
          borderRadius: metrics.radius,
          backgroundColor: palette.background,
        },
        variant === "outline"
          ? { borderWidth: 1, borderColor: colors.outlineStrong }
          : null,
        fullWidth ? styles.fullWidth : styles.hugContent,
        isInactive ? styles.inactive : null,
        style,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: metrics.radius }]}
        />
      ) : null}
      <View style={styles.content}>
        {loading ? (
          <Spinner
            size={metrics.icon + 4}
            color={palette.text}
            trackColor={
              variant === "primary" || variant === "destructive"
                ? "rgba(255, 255, 255, 0.35)"
                : colors.surfaceHighest
            }
          />
        ) : (
          content
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  hugContent: {
    alignSelf: "flex-start",
  },
  inactive: {
    opacity: 0.55,
  },
});
