import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/use-theme";

const hasLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

export type GlassSurfaceProps = ViewProps & {
  /** Whether the glass reacts to touches (iOS 26 only). */
  interactive?: boolean;
  /** Blur strength for the pre-iOS 26 fallback. */
  intensity?: number;
  /** Optional tint mixed into the glass. */
  tintColor?: string;
};

/**
 * Frosted surface used for floating chrome (header buttons, docked bars).
 *
 * - iOS 26+: real Liquid Glass.
 * - Older iOS: system material blur.
 * - Android / web: translucent card surface.
 *
 * Give it a `borderRadius` through `style`; it is clipped automatically.
 */
export function GlassSurface({
  interactive = false,
  intensity = 45,
  tintColor,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const { colors, isDark } = useTheme();

  if (hasLiquidGlass) {
    return (
      <GlassView
        {...rest}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor}
        colorScheme={isDark ? "dark" : "light"}
        style={[styles.clip, style]}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === "ios") {
    return (
      <BlurView
        {...rest}
        intensity={intensity}
        tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
        style={[styles.clip, style]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      {...rest}
      style={[
        styles.clip,
        {
          backgroundColor: colors.surfaceLowest,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.outline,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
});
