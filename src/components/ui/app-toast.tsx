import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useReducedMotion, ZoomIn } from "react-native-reanimated";
import type { ToastConfig, ToastConfigParams } from "react-native-toast-message";

import { AppText } from "@/components/ui/app-text";
import { IconBadge, type IconBadgeTone } from "@/components/ui/icon-badge";
import { IconButton } from "@/components/ui/icon-button";
import type { IconName } from "@/components/ui/icon-names";
import { Layout, Radii, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type AppToastTone = "success" | "error" | "info" | "saved" | "removed";

export type AppToastProps = {
  tone?: AppToastTone;
};

const MAX_TOAST_WIDTH = 480;
const ACCENT_WIDTH = 4;

const toneStyles: Record<
  AppToastTone,
  { icon: IconName; badge: IconBadgeTone; accent: "success" | "error" | "primary" | "textTertiary" }
> = {
  success: { icon: "checkCircle", badge: "success", accent: "success" },
  saved: { icon: "bookmarkFill", badge: "success", accent: "success" },
  removed: { icon: "bookmark", badge: "neutral", accent: "textTertiary" },
  info: { icon: "info", badge: "primary", accent: "primary" },
  error: { icon: "alert", badge: "danger", accent: "error" },
};

function resolveTone(type: string, props: AppToastProps | undefined): AppToastTone {
  if (props?.tone) {
    return props.tone;
  }

  return type in toneStyles ? (type as AppToastTone) : "info";
}

/**
 * Brand toast card: floating tonal surface, tinted icon badge and a thin
 * accent bar. Solid (not glass) on purpose: the toast animates in with
 * opacity, which prevents system material / glass views from rendering.
 * Tap or swipe to dismiss; the icon pops in for a little delight.
 */
export function AppToastCard({
  type,
  text1,
  text2,
  props,
  hide,
  onPress,
}: ToastConfigParams<AppToastProps>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const tone = resolveTone(type, props);
  const { icon, badge, accent } = toneStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        Shadows.floating,
        {
          width: Math.min(width - Layout.screenPadding * 2, MAX_TOAST_WIDTH),
          backgroundColor: colors.surfaceLowest,
          borderColor: colors.outline,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: colors[accent] }]} />

      <Animated.View
        entering={reducedMotion ? undefined : ZoomIn.delay(60).springify().damping(14)}
      >
        <IconBadge icon={icon} tone={badge} size={40} radius="circle" iconSize={20} />
      </Animated.View>

      <View style={styles.texts}>
        {text1 ? (
          <AppText variant="headline" numberOfLines={1}>
            {text1}
          </AppText>
        ) : null}
        {text2 ? (
          <AppText variant="footnote" color="textSecondary" numberOfLines={2}>
            {text2}
          </AppText>
        ) : null}
      </View>

      <IconButton
        icon="close"
        variant="plain"
        size={32}
        iconSize={13}
        iconColor={colors.textTertiary}
        haptic="none"
        accessibilityLabel="Dismiss notification"
        onPress={() => hide()}
      />
    </Pressable>
  );
}

export const toastConfig: ToastConfig = {
  app: (params) => <AppToastCard {...params} />,
  success: (params) => <AppToastCard {...params} />,
  error: (params) => <AppToastCard {...params} />,
  info: (params) => <AppToastCard {...params} />,
};

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: Spacing.md,
    bottom: Spacing.md,
    width: ACCENT_WIDTH,
    borderTopRightRadius: ACCENT_WIDTH,
    borderBottomRightRadius: ACCENT_WIDTH,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
});
