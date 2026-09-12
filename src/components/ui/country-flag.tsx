import { Image } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Radii } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type CountryFlagSize = "sm" | "md" | "lg" | "xl";

type CountryFlagProps = {
  /** ISO 3166-1 alpha-2 code, lower case. */
  code?: string | null;
  emoji?: string | null;
  size?: CountryFlagSize;
  style?: StyleProp<ViewStyle>;
};

const sizes: Record<CountryFlagSize, { width: number; height: number; font: number }> = {
  sm: { width: 28, height: 20, font: 16 },
  md: { width: 40, height: 28, font: 22 },
  lg: { width: 56, height: 40, font: 32 },
  xl: { width: 72, height: 52, font: 42 },
};

export function flagImageUrl(code: string) {
  return `https://flagcdn.com/w160/${code.toLowerCase()}.png`;
}

/**
 * Soft-rect flag (4px radius per DESIGN.md). Prefers a cached raster flag,
 * falls back to the emoji, then to a neutral icon.
 */
export function CountryFlag({ code, emoji, size = "md", style }: CountryFlagProps) {
  const { colors } = useTheme();
  const metrics = sizes[size];
  const frame = {
    width: metrics.width,
    height: metrics.height,
  };

  if (code) {
    return (
      <View
        style={[
          styles.frame,
          frame,
          { backgroundColor: colors.surfaceLow, borderColor: colors.outline },
          style,
        ]}
      >
        <Image
          source={{ uri: flagImageUrl(code) }}
          style={frame}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={code}
          transition={150}
          accessibilityLabel={`Flag of ${code.toUpperCase()}`}
        />
      </View>
    );
  }

  if (emoji) {
    return (
      <View style={[styles.emojiFrame, frame, style]}>
        <Text style={{ fontSize: metrics.font, lineHeight: metrics.height + 4 }}>
          {emoji}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frame,
        styles.emojiFrame,
        frame,
        { backgroundColor: colors.surfaceLow, borderColor: colors.outline },
        style,
      ]}
    >
      <Icon name="flag" size={metrics.height * 0.6} color={colors.textTertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radii.flag,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  emojiFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
});
