import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import {
  FilterBar as SharedFilterBar,
  type FilterOption,
} from "@/components/ui/filter-bar.shared";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";

export type { FilterOption };

type FilterBarProps<T extends string> = {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "segmented" | "pills";
  style?: StyleProp<ViewStyle>;
};

/**
 * iOS: the system segmented control (UISegmentedControl via SwiftUI Picker),
 * with its Liquid Glass look, VoiceOver traits and drag-to-select. Scrolling
 * pill filters keep the shared implementation.
 */
export function FilterBar<T extends string>(props: FilterBarProps<T>) {
  const { scheme } = useTheme();
  const { options, value, onChange, variant = "segmented", style } = props;

  if (variant !== "segmented") {
    return <SharedFilterBar {...props} />;
  }

  return (
    <View style={[styles.wrap, style]}>
      <Host matchContents={{ vertical: true }} colorScheme={scheme} style={styles.host}>
        <Picker<string>
          selection={value}
          onSelectionChange={(selection) => {
            const next = options.find((option) => option.key === selection);
            if (next && next.key !== value) {
              haptic.selection();
              onChange(next.key);
            }
          }}
          modifiers={[pickerStyle("segmented")]}
        >
          {options.map((option) => (
            <Text key={option.key} modifiers={[tag(option.key)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  host: {
    width: "100%",
  },
});
