import { Alert } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import type { NativeMenuButtonProps } from "@/components/ui/native-menu-button.types";

/**
 * Overflow menu button. iOS renders a native SwiftUI menu
 * (see `native-menu-button.ios.tsx`); other platforms use an alert sheet.
 */
export function NativeMenuButton({
  actions,
  accessibilityLabel,
  icon = "ellipsis",
  size,
  variant = "glass",
  style,
}: NativeMenuButtonProps) {
  const openMenu = () => {
    Alert.alert(accessibilityLabel, undefined, [
      ...actions.map((action) => ({
        text: action.title,
        style: action.destructive ? ("destructive" as const) : ("default" as const),
        onPress: action.onPress,
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <IconButton
      icon={icon}
      variant={variant}
      size={size}
      accessibilityLabel={accessibilityLabel}
      onPress={openMenu}
      style={style}
    />
  );
}
