import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
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

import { Motion } from "@/constants/theme";
import { haptic, type HapticKind } from "@/lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. */
  scaleTo?: number;
  /** Opacity applied while pressed. */
  pressedOpacity?: number;
  /** Haptic feedback fired on press. */
  haptic?: HapticKind | "none";
};

/**
 * The single tap primitive of the app: a spring-driven scale + opacity
 * micro interaction that runs entirely on the UI thread.
 */
export function PressableScale({
  scaleTo = 0.97,
  pressedOpacity = 0.9,
  haptic: hapticKind = "none",
  onPressIn,
  onPressOut,
  onPress,
  style,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - (1 - pressedOpacity) * pressed.value,
    transform: [
      {
        scale: reducedMotion ? 1 : 1 - (1 - scaleTo) * pressed.value,
      },
    ],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    pressed.value = withTiming(1, {
      duration: Motion.duration.instant,
      easing: Motion.easing.standard,
    });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    pressed.value = withSpring(0, Motion.spring.gentle);
    onPressOut?.(event);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (hapticKind !== "none") {
      haptic[hapticKind]();
    }

    onPress?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
    />
  );
}
