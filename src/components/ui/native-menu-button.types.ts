import type { StyleProp, ViewStyle } from "react-native";

import type { IconName } from "@/components/ui/icon-names";

export type MenuAction = {
  key: string;
  title: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
};

export type NativeMenuButtonProps = {
  actions: MenuAction[];
  accessibilityLabel: string;
  icon?: IconName;
  size?: number;
  variant?: "glass" | "tonal";
  style?: StyleProp<ViewStyle>;
};
