import { Host, Toggle } from "@expo/ui/swift-ui";
import { tint } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import type { NativeToggleProps } from "@/components/ui/native-toggle.types";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";

/**
 * Native SwiftUI toggle hosted inside the React Native layout.
 */
export function NativeToggle({ value, onValueChange, label, style }: NativeToggleProps) {
  const { colors, scheme } = useTheme();

  return (
    <Host
      matchContents={{ vertical: true, horizontal: false }}
      colorScheme={scheme}
      style={[styles.host, style]}
    >
      <Toggle
        isOn={value}
        label={label}
        onIsOnChange={(next) => {
          haptic.selection();
          onValueChange(next);
        }}
        modifiers={[tint(colors.primary)]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
    minHeight: 44,
  },
});
