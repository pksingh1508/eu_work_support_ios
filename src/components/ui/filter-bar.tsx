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

type OptionLayouts = Record<string, { x: number; width: number }>;

const TRACK_PADDING = Spacing.xs;

/**
 * Segmented filter with a spring-driven sliding indicator.
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
  const layouts = useSharedValue<OptionLayouts>({});

  const indicatorStyle = useAnimatedStyle(() => {
    const layout = layouts.value[value];

    if (!layout) {
      return { opacity: 0 };
    }

    return {
      opacity: 1,
      width: reducedMotion
        ? layout.width
        : withSpring(layout.width, Motion.spring.gentle),
      transform: [
        {
          translateX: reducedMotion
            ? layout.x
            : withSpring(layout.x, Motion.spring.gentle),
        },
      ],
    };
  }, [value, reducedMotion]);

  const createLayoutHandler = (key: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.value = { ...layouts.value, [key]: { x, width } };
  };

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
            onLayout={createLayoutHandler(option.key)}
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
