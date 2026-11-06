import { StyleSheet, Text, type TextProps } from "react-native";

import {
  Typography,
  type ColorToken,
  type ThemeColors,
  type TypographyVariant,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type AppTextColor = ColorToken | (string & {});

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: AppTextColor;
  align?: "left" | "center" | "right";
  uppercase?: boolean;
};

/**
 * How far Dynamic Type may grow each style. Running text follows the user's
 * setting well into the accessibility sizes; big brand headings, which are
 * already large, stop earlier so they don't break across every word.
 */
const HEADING_MAX_FONT_SCALE = 1.5;
const TEXT_MAX_FONT_SCALE = 2.2;
const HEADING_VARIANTS = new Set<TypographyVariant>(["display", "title1", "title2"]);

export function resolveThemeColor(colors: ThemeColors, color: AppTextColor) {
  return color in colors ? colors[color as ColorToken] : color;
}

export function AppText({
  variant = "body",
  color = "text",
  align,
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={
        HEADING_VARIANTS.has(variant) ? HEADING_MAX_FONT_SCALE : TEXT_MAX_FONT_SCALE
      }
      {...rest}
      style={[
        Typography[variant],
        { color: resolveThemeColor(colors, color) },
        align ? { textAlign: align } : null,
        uppercase ? styles.uppercase : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  uppercase: {
    textTransform: "uppercase",
  },
});
