import { Stack } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

/**
 * The auth group is presented as a modal card; screens inside it push
 * natively (sign-in -> verify / forgot password).
 */
export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        animation: "default",
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
