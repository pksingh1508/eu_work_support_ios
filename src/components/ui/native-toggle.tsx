import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { NativeToggleProps } from "@/components/ui/native-toggle.types";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";

/**
 * Labelled switch. iOS renders a SwiftUI Toggle (see `native-toggle.ios.tsx`).
 */
export function NativeToggle({ value, onValueChange, label, style }: NativeToggleProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <AppText variant="callout" style={styles.label}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptic.selection();
          onValueChange(next);
        }}
        trackColor={{ false: colors.surfaceHighest, true: colors.primary }}
        thumbColor={colors.surfaceLowest}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    minHeight: 44,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
});
