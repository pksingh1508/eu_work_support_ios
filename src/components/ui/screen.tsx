import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { Layout, Spacing, type ColorToken } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ScreenProps = PropsWithChildren<{
  /** Safe area edges to respect. Tabs and stack screens default to top only. */
  edges?: Edge[];
  /** Render children inside a vertical ScrollView. */
  scroll?: boolean;
  /** Apply the standard horizontal screen padding. */
  padded?: boolean;
  /** Wrap in a KeyboardAvoidingView (screens with inputs). */
  keyboard?: boolean;
  /** Content rendered above the scroll area (headers that must not scroll). */
  header?: ReactNode;
  background?: ColorToken;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "style">;
}>;

const defaultEdges: Edge[] = ["top"];

/**
 * Screen scaffold: safe area, background, optional scroll + keyboard handling.
 */
export function Screen({
  edges = defaultEdges,
  scroll = false,
  padded = true,
  keyboard = false,
  header,
  background = "background",
  contentContainerStyle,
  style,
  scrollProps,
  children,
}: ScreenProps) {
  const { colors } = useTheme();

  const body = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        padded ? styles.padded : null,
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded ? styles.padded : null, contentContainerStyle]}>
      {children}
    </View>
  );

  const content = keyboard ? (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", default: undefined })}
      style={styles.flex}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors[background] }, style]}
    >
      {header}
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.bottomPadding + Spacing.lg,
  },
  padded: {
    paddingHorizontal: Layout.screenPadding,
  },
});
