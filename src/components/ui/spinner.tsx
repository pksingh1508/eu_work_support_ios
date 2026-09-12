import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Motion } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SpinnerProps = {
  size?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const ROTATION_DURATION = 850;

/**
 * Lightweight ring spinner driven on the UI thread.
 */
export function Spinner({
  size = 28,
  color,
  trackColor,
  style,
  accessibilityLabel = "Loading",
}: SpinnerProps) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: ROTATION_DURATION,
        easing: Motion.easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const strokeWidth = Math.max(2, Math.round(size * 0.1));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor ?? colors.primarySoft,
            borderTopColor: color ?? colors.primary,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
  },
});
