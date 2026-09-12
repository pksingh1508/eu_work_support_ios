import { Button, Host, Image, Menu } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/ui/glass-surface";
import { getSFSymbol } from "@/components/ui/icon-names";
import type { NativeMenuButtonProps } from "@/components/ui/native-menu-button.types";
import { Layout, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Native UIMenu (via SwiftUI `Menu`) behind a glass circle. Tapping the
 * button opens the system menu with SF Symbols, roles and haptics for free.
 */
export function NativeMenuButton({
  actions,
  accessibilityLabel,
  icon = "ellipsis",
  size = Layout.headerButtonSize,
  variant = "glass",
  style,
}: NativeMenuButtonProps) {
  const { colors, scheme } = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const iconColor = variant === "glass" ? colors.text : colors.primary;

  return (
    <View
      style={[shape, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {variant === "glass" ? (
        <GlassSurface interactive style={[StyleSheet.absoluteFill, shape, Shadows.card]} />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, shape, { backgroundColor: colors.surfaceHigh }]}
        />
      )}
      <Host colorScheme={scheme} style={StyleSheet.absoluteFill}>
        <Menu
          label={
            <Image
              systemName={getSFSymbol(icon)}
              size={Math.round(size * 0.4)}
              color={iconColor}
              modifiers={[frame({ width: size, height: size })]}
            />
          }
        >
          {actions.map((action) => (
            <Button
              key={action.key}
              label={action.title}
              systemImage={action.icon ? getSFSymbol(action.icon) : undefined}
              role={action.destructive ? "destructive" : "default"}
              onPress={action.onPress}
            />
          ))}
        </Menu>
      </Host>
    </View>
  );
}
