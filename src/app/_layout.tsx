import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AppProviders } from "@/components/app-providers";
import { toastConfig } from "@/components/ui/app-toast";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { TOAST_DURATION_MS } from "@/lib/toast";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <AppProviders>
        <RootNavigator />
        <StatusBar style="auto" />
        <AppToaster />
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

/**
 * Global toast host. Rendered last so it floats above every screen and modal.
 */
function AppToaster() {
  const insets = useSafeAreaInsets();

  return (
    <Toast
      config={toastConfig}
      position="top"
      topOffset={insets.top + Spacing.sm}
      visibilityTime={TOAST_DURATION_MS}
      swipeable
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
