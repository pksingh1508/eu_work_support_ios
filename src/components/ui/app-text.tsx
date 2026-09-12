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

const MAX_FONT_SCALE = 1.35;

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
      maxFontSizeMultiplier={MAX_FONT_SCALE}
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
