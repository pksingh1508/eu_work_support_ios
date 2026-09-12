import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { Motion } from "@/constants/theme";

type EntranceProps = PropsWithChildren<{
  /** Position in a list; drives the stagger delay (capped). */
  index?: number;
  /** Extra delay before the stagger, in ms. */
  delay?: number;
  /** Direction of the reveal. */
  from?: "bottom" | "none";
  /** Animate layout changes (reorders, removals). */
  layout?: boolean;
  /** Fade out when unmounted. */
  exit?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export const listLayoutTransition = LinearTransition.springify()
  .damping(22)
  .stiffness(220)
  .mass(0.9);

/**
 * Staggered reveal used for lists and screen content. Respects the system
 * "reduce motion" setting by rendering content immediately.
 */
export function Entrance({
  index = 0,
  delay = 0,
  from = "bottom",
  layout = false,
  exit = false,
  style,
  children,
}: EntranceProps) {
  const reducedMotion = useReducedMotion();
  const staggerDelay =
    delay + Math.min(index, Motion.stagger.maxIndex) * Motion.stagger.step;

  const entering = reducedMotion
    ? undefined
    : (from === "bottom" ? FadeInDown : FadeIn)
        .delay(staggerDelay)
        .duration(Motion.duration.slow)
        .easing(Easing.out(Easing.cubic));

  return (
    <Animated.View
      entering={entering}
      exiting={exit && !reducedMotion ? FadeOut.duration(Motion.duration.fast) : undefined}
      layout={layout && !reducedMotion ? listLayoutTransition : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
