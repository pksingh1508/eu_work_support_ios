import { SymbolView } from "expo-symbols";

import { iconMap } from "@/components/ui/icon-names";
import type { IconProps } from "@/components/ui/icon.types";
import { useTheme } from "@/hooks/use-theme";

/**
 * iOS icon rendered with SF Symbols so iconography matches the system.
 */
export function Icon({
  name,
  size = 22,
  color,
  weight = "medium",
  style,
}: IconProps) {
  const { colors } = useTheme();

  return (
    <SymbolView
      name={iconMap[name].sf}
      size={size}
      tintColor={color ?? colors.text}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
    />
  );
}
