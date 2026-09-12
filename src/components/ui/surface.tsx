import { StyleSheet, View, type ViewProps } from "react-native";

import { Radii, Shadows, Spacing, type ThemeColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type SurfaceLevel = 0 | 1 | 2 | 3;
export type SurfaceTone =
  | "default"
  | "primary"
  | "tertiary"
  | "success"
  | "error";

export type SurfaceProps = ViewProps & {
  /** Tonal layer: 0 background, 1 inset, 2 card (default), 3 emphasised. */
  level?: SurfaceLevel;
  tone?: SurfaceTone;
  radius?: keyof typeof Radii;
  padding?: keyof typeof Spacing | 0;
  shadow?: keyof typeof Shadows;
  /** Ghost border (outline at low opacity). Off by default per the no-line rule. */
  bordered?: boolean;
};

export function surfaceColor(
  colors: ThemeColors,
  level: SurfaceLevel,
  tone: SurfaceTone,
) {
  switch (tone) {
    case "primary":
      return colors.primarySoft;
    case "tertiary":
      return colors.tertiarySoft;
    case "success":
      return colors.successSoft;
    case "error":
      return colors.errorSoft;
    default:
      break;
  }

  switch (level) {
    case 0:
      return colors.background;
    case 1:
      return colors.surfaceLow;
    case 3:
      return colors.surfaceHigh;
    default:
      return colors.surfaceLowest;
  }
}

/**
 * Tonal card. Depth comes from stacking surfaces, not from borders.
 */
export function Surface({
  level = 2,
  tone = "default",
  radius = "xl",
  padding = "xl",
  shadow = "none",
  bordered = false,
  style,
  ...rest
}: SurfaceProps) {
  const { colors } = useTheme();

  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: surfaceColor(colors, level, tone),
          borderRadius: Radii[radius],
          padding: padding === 0 ? 0 : Spacing[padding],
        },
        Shadows[shadow],
        bordered
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.outline }
          : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "visible",
  },
});
