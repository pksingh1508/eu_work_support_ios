import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SectionHeadingProps = {
  title: string;
  eyebrow?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
};

export function SectionHeading({ title, eyebrow, action, style }: SectionHeadingProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.titles}>
        {eyebrow ? (
          <AppText variant="eyebrow" color="textTertiary" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title2">{title}</AppText>
      </View>
      {action ? (
        <PressableScale
          onPress={action.onPress}
          hitSlop={Spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.action}
        >
          <AppText variant="label" color="primary">
            {action.label}
          </AppText>
          <Icon name="chevronRight" size={12} color={colors.primary} weight="bold" />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    marginBottom: Spacing.xs,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingBottom: Spacing.xxs,
  },
});
