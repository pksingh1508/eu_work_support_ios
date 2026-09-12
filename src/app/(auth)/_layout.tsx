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
        headerShown: false,
        animation: "default",
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
