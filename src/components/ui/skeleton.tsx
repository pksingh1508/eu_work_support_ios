import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Surface } from "@/components/ui/surface";
import { Motion, Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const SHIMMER_DURATION = 1300;

/**
 * Shimmering placeholder block.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = Radii.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION,
        easing: Motion.easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reducedMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-containerWidth.value, containerWidth.value],
        ),
      },
    ],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    containerWidth.value = event.nativeEvent.layout.width;
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.base,
        { width, height, borderRadius: radius, backgroundColor: colors.skeleton },
        style,
      ]}
    >
      {reducedMotion ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <LinearGradient
            colors={[colors.skeleton, colors.skeletonHighlight, colors.skeleton]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Card-shaped placeholder that mirrors the result / saved cards.
 */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Surface style={style}>
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={28} radius={Radii.flag} />
        <Skeleton width={110} height={12} />
      </View>
      <Skeleton width="72%" height={20} style={styles.cardTitle} />
      <Skeleton width="100%" height={12} style={styles.cardLine} />
      <Skeleton width="86%" height={12} style={styles.cardLine} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardTitle: {
    marginTop: Spacing.lg,
  },
  cardLine: {
    marginTop: Spacing.sm,
  },
});
