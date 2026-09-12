import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { iconMap } from "@/components/ui/icon-names";
import type { IconProps } from "@/components/ui/icon.types";
import { useTheme } from "@/hooks/use-theme";

/**
 * Cross-platform icon. iOS uses SF Symbols (see `icon.ios.tsx`), every other
 * platform renders the matching Ionicons glyph.
 */
export function Icon({ name, size = 22, color, style }: IconProps) {
  const { colors } = useTheme();

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Ionicons name={iconMap[name].ion} size={size} color={color ?? colors.text} />
    </View>
  );
}
