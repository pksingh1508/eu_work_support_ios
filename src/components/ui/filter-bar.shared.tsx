import { useCallback, useEffect, useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { Motion, Radii, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";

export type FilterOption<T extends string> = {
  key: T;
  label: string;
  icon?: IconName;
};

type FilterBarProps<T extends string> = {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `segmented` shares the width equally, `pills` hugs each label and scrolls. */
  variant?: "segmented" | "pills";
  style?: StyleProp<ViewStyle>;
};

type OptionLayout = { x: number; width: number };

const TRACK_PADDING = Spacing.xs;

/**
 * Segmented filter with a spring-driven sliding indicator.
 *
 * Option layouts are kept in a plain ref (the JS thread is the only writer)
 * and the indicator is driven by dedicated shared values, so every option
 * gets the highlight regardless of the order in which layouts arrive.
 */
export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  variant = "segmented",
  style,
}: FilterBarProps<T>) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const layoutsRef = useRef<Record<string, OptionLayout>>({});
  const hasPositionedRef = useRef(false);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const moveIndicator = useCallback(
    (key: string, animate: boolean) => {
      const layout = layoutsRef.current[key];

      if (!layout) {
        return;
      }

      const shouldAnimate = animate && hasPositionedRef.current && !reducedMotion;
      hasPositionedRef.current = true;

      indicatorX.value = shouldAnimate
        ? withSpring(layout.x, Motion.spring.gentle)
        : layout.x;
      indicatorWidth.value = shouldAnimate
        ? withSpring(layout.width, Motion.spring.gentle)
        : layout.width;
      indicatorOpacity.value = withTiming(1, { duration: Motion.duration.fast });
    },
    [indicatorOpacity, indicatorWidth, indicatorX, reducedMotion],
  );

  useEffect(() => {
    moveIndicator(value, true);
  }, [moveIndicator, value]);

  const handleLayout = (key: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    const previous = layoutsRef.current[key];

    if (previous && previous.x === x && previous.width === width) {
      return;
    }

    layoutsRef.current[key] = { x, width };

    if (key === value) {
      moveIndicator(key, false);
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const select = (nextValue: T) => {
    if (nextValue === value) {
      return;
    }

    haptic.selection();
    onChange(nextValue);
  };

  const track = (
    <View
      style={[
        styles.track,
        variant === "segmented" ? styles.trackStretch : null,
        { backgroundColor: colors.surfaceLow },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          Shadows.card,
          { backgroundColor: colors.surfaceLowest },
          indicatorStyle,
        ]}
      />
      {options.map((option) => {
        const isActive = option.key === value;

        return (
          <Pressable
            key={option.key}
            onLayout={(event) => handleLayout(option.key, event)}
            onPress={() => select(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            style={[
              styles.option,
              variant === "segmented" ? styles.optionStretch : null,
            ]}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={14}
                color={isActive ? colors.primary : colors.textSecondary}
              />
            ) : null}
            <AppText
              variant="label"
              color={isActive ? "primary" : "textSecondary"}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  if (variant === "pills") {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={styles.pillsContent}
      >
        {track}
      </ScrollView>
    );
  }

  return <View style={style}>{track}</View>;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    padding: TRACK_PADDING,
    borderRadius: Radii.pill,
    alignSelf: "flex-start",
  },
  trackStretch: {
    alignSelf: "stretch",
  },
  indicator: {
    position: "absolute",
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: 0,
    borderRadius: Radii.pill,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs + Spacing.xxs,
    minHeight: 38,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
  },
  optionStretch: {
    flex: 1,
  },
  pillsContent: {
    flexGrow: 0,
  },
});
