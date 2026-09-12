import { useFocusEffect } from "expo-router";
import { useCallback, type PropsWithChildren } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Motion } from "@/constants/theme";

type TabScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

const ENTER_TRANSLATE = 10;
const ENTER_SCALE = 0.985;
const ENTER_OPACITY = 0.4;

/**
 * Wraps the content of a bottom tab. Each time the tab gains focus the
 * content settles in with a short fade + rise, so switching tabs feels
 * continuous instead of a hard cut.
 */
export function TabScreen({ style, children }: TabScreenProps) {
  const progress = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useFocusEffect(
    useCallback(() => {
      if (reducedMotion) {
        progress.value = 1;
        return;
      }

      progress.value = 0;
      progress.value = withTiming(1, {
        duration: Motion.duration.screen,
        easing: Motion.easing.emphasized,
      });
    }, [progress, reducedMotion]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: ENTER_OPACITY + (1 - ENTER_OPACITY) * progress.value,
    transform: [
      { translateY: (1 - progress.value) * ENTER_TRANSLATE },
      { scale: ENTER_SCALE + (1 - ENTER_SCALE) * progress.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
