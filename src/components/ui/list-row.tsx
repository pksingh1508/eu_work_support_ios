import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge, type IconBadgeTone } from "@/components/ui/icon-badge";
import type { IconName } from "@/components/ui/icon-names";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: IconBadgeTone;
  tone?: "default" | "danger";
  /** Right-hand content. Defaults to a chevron when the row is pressable. */
  trailing?: ReactNode | "chevron" | "none";
  /** Short value shown before the chevron (e.g. "English"). */
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export const LIST_ROW_ICON_SIZE = 40;

/**
 * Menu row used in Profile, Account, Support and Legal lists.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconTone,
  tone = "default",
  trailing,
  value,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const { colors } = useTheme();
  const isDanger = tone === "danger";
  const resolvedTrailing =
    trailing === undefined ? (onPress ? "chevron" : "none") : trailing;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      scaleTo={0.985}
      pressedOpacity={0.8}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.row, disabled ? styles.disabled : null, style]}
    >
      {icon ? (
        <IconBadge
          icon={icon}
          size={LIST_ROW_ICON_SIZE}
          tone={iconTone ?? (isDanger ? "danger" : "neutral")}
        />
      ) : null}

      <View style={styles.textColumn}>
        <AppText
          variant="headline"
          color={isDanger ? "error" : "text"}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="footnote"
            color="textSecondary"
            numberOfLines={2}
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {value ? (
        <AppText variant="callout" color="textTertiary" numberOfLines={1}>
          {value}
        </AppText>
      ) : null}

      {resolvedTrailing === "chevron" ? (
        <Icon name="chevronRight" size={16} color={colors.textTertiary} weight="semibold" />
      ) : resolvedTrailing === "none" ? null : (
        resolvedTrailing
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 64,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: Spacing.xxs,
  },
  disabled: {
    opacity: 0.6,
  },
});
