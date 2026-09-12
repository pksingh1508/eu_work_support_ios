import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";

import { AppProviders } from "@/components/app-providers";
import { Radii, Shadows, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <AppProviders>
        <RootNavigator />
        <AppToaster />
        <StatusBar style="auto" />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "default",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
      <Stack.Screen name="country/[slug]" />
      <Stack.Screen name="visa/[id]" />
      <Stack.Screen name="profile/account" />
      <Stack.Screen name="profile/change-password" />
      <Stack.Screen name="profile/legal" />
      <Stack.Screen name="profile/legal/[policy]" />
      <Stack.Screen name="profile/sources-and-disclaimer" />
      <Stack.Screen name="profile/support" />
      <Stack.Screen name="profile/danger-zone" />
      <Stack.Screen name="profile/faq" />
      <Stack.Screen name="profile/app-info" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/saved-items" />
      <Stack.Screen name="profile/help" />
    </Stack>
  );
}

function AppToaster() {
  const { colors, scheme } = useTheme();

  return (
    <Toaster
      theme={scheme}
      duration={2200}
      position="top-center"
      visibleToasts={2}
      swipeToDismissDirection="up"
      toastOptions={{
        titleStyle: {
          ...Typography.headline,
          color: colors.text,
        },
        descriptionStyle: {
          ...Typography.footnote,
          color: colors.textSecondary,
        },
        style: {
          backgroundColor: colors.surfaceLowest,
          borderColor: colors.outline,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: Radii.lg,
          ...Shadows.floating,
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
