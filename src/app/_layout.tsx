import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AppProviders } from "@/components/app-providers";
import { toastConfig } from "@/components/ui/app-toast";
import { ErrorState } from "@/components/ui/state-views";
import { Layout, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { TOAST_DURATION_MS } from "@/lib/toast";

/**
 * Last line of defence: a render error anywhere in the app shows this
 * themed screen with a retry instead of a crash or a blank window. It renders
 * outside the app providers, so it only uses provider-free primitives.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();

  useEffect(() => {
    console.warn("Unhandled render error", error);
  }, [error]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.errorContent}>
        <ErrorState
          title="Something went wrong"
          message="The app hit an unexpected problem. Try again, or restart the app if it keeps happening."
          action={{ label: "Try again", onPress: () => void retry() }}
        />
      </View>
    </SafeAreaView>
  );
}

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
        // Native UINavigationBar: Liquid Glass on iOS 26, content scrolls
        // under it, back button keeps its long-press history menu.
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerLargeTitleStyle: { color: colors.text },
        animation: "default",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Home" }} />
      <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="country/[slug]" options={{ title: "" }} />
      <Stack.Screen name="visa/[id]" options={{ title: "" }} />
      <Stack.Screen name="profile/account" options={{ title: "Account" }} />
      <Stack.Screen name="profile/change-password" options={{ title: "Change Password" }} />
      <Stack.Screen name="profile/legal" options={{ title: "Legal" }} />
      <Stack.Screen name="profile/legal/[policy]" options={{ title: "" }} />
      <Stack.Screen
        name="profile/sources-and-disclaimer"
        options={{ title: "Sources & Disclaimer" }}
      />
      <Stack.Screen name="profile/support" options={{ title: "Support" }} />
      <Stack.Screen name="profile/danger-zone" options={{ title: "Delete Account" }} />
      <Stack.Screen name="profile/faq" options={{ title: "FAQ" }} />
      <Stack.Screen name="profile/app-info" options={{ title: "App Info" }} />
      <Stack.Screen name="profile/settings" options={{ title: "Settings" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="profile/saved-items" options={{ headerShown: false }} />
      <Stack.Screen name="profile/help" options={{ headerShown: false }} />
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
  errorContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Layout.screenPadding,
  },
});
