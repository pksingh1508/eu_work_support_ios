import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export type GlassSurfaceProps = ViewProps & {
  /** Reserved for platforms with interactive glass; currently a no-op. */
  interactive?: boolean;
  /** Blur strength on iOS. */
  intensity?: number;
  /** Optional tint mixed into the surface (non-iOS fallback only). */
  tintColor?: string;
};

/**
 * Frosted surface used for floating chrome (header buttons, card actions).
 *
 * iOS uses the system thin material blur. Liquid Glass (`expo-glass-effect`)
 * was tried first but does not render when the view is first laid out under
 * an opacity animation (list entrances, tab fades, toast slide-ins), so the
 * material blur is used for reliability. Android / web get a translucent card.
 *
 * Give it a `borderRadius` through `style`; it is clipped automatically.
 */
export function GlassSurface({
  intensity = 45,
  tintColor,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const { colors, isDark } = useTheme();

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
          backgroundColor: tintColor ?? colors.surfaceLowest,
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
