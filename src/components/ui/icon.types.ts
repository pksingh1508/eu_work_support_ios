import type { StyleProp, ViewStyle } from "react-native";

import type { IconName } from "@/components/ui/icon-names";

export type IconWeight = "regular" | "medium" | "semibold" | "bold";

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
};
