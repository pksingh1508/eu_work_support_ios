import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { listLayoutTransition } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import type { IconName } from "@/components/ui/icon-names";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Motion, Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type AccordionProps = PropsWithChildren<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: IconName;
}>;

/**
 * Expandable card with a rotating chevron and animated body.
 */
export function Accordion({ title, isOpen, onToggle, icon, children }: AccordionProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(isOpen ? "180deg" : "0deg", {
          duration: Motion.duration.base,
          easing: Motion.easing.standard,
        }),
      },
    ],
  }));

  return (
    <Animated.View
      layout={reducedMotion ? undefined : listLayoutTransition}
      style={[styles.card, { backgroundColor: colors.surfaceLowest }]}
    >
      <PressableScale
        onPress={onToggle}
        scaleTo={0.99}
        pressedOpacity={0.85}
        haptic="selection"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        style={styles.header}
      >
        {icon ? <IconBadge icon={icon} size={40} /> : null}
        <AppText variant="headline" style={styles.title}>
          {title}
        </AppText>
        <Animated.View
          style={[styles.chevron, { backgroundColor: colors.surfaceLow }, chevronStyle]}
        >
          <Icon name="chevronDown" size={14} color={colors.textSecondary} weight="bold" />
        </Animated.View>
      </PressableScale>

      {isOpen ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(Motion.duration.base)}
          exiting={reducedMotion ? undefined : FadeOutUp.duration(Motion.duration.fast)}
          style={styles.body}
        >
          <View style={[styles.bodyInner, { backgroundColor: colors.surfaceLow }]}>
            {children}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 72,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  bodyInner: {
    borderRadius: Radii.md,
    padding: Spacing.lg,
  },
});
