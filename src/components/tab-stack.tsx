import { Stack } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

/**
 * Native stack inside a bottom tab, so the tab's root screen gets a real iOS
 * large title that collapses into the Liquid Glass bar as you scroll.
 */
export function TabStack({ title }: { title: string }) {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerLargeTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
