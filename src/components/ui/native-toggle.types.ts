import type { StyleProp, ViewStyle } from "react-native";

export type NativeToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  style?: StyleProp<ViewStyle>;
};
