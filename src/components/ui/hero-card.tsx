import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Radii, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type HeroCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Deep-navy gradient card with a soft "lithographic" highlight,
 * used for the headline block of detail screens.
 */
export function HeroCard({ style, children }: HeroCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.shadow, Shadows.hero, style]}>
      <LinearGradient
        colors={[colors.heroStart, colors.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View
          pointerEvents="none"
          style={[styles.orb, styles.orbLarge, { backgroundColor: colors.heroSurface }]}
        />
        <View
          pointerEvents="none"
          style={[styles.orb, styles.orbSmall, { backgroundColor: colors.heroSurface }]}
        />
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: Radii.hero,
  },
  card: {
    borderRadius: Radii.hero,
    padding: Spacing.xxl,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: Radii.pill,
  },
  orbLarge: {
    width: 260,
    height: 260,
    top: -140,
    right: -90,
  },
  orbSmall: {
    width: 140,
    height: 140,
    bottom: -70,
    left: -40,
  },
});
