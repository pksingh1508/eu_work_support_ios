import { ClerkProvider, useAuth } from "@clerk/expo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { useRouter, useSegments } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { PropsWithChildren, useEffect, useMemo } from "react";

import { AuthAccessProvider, useAuthAccess } from "@/features/auth/access";
import { PurchasesBridge } from "@/features/billing/purchases-bridge";
import { useSavedStore } from "@/features/saved/saved-store";
import { useThemeStore } from "@/features/theme/theme-store";
import { useTheme } from "@/hooks/use-theme";
import { clerkPublishableKey, clerkTokenCache } from "@/lib/clerk";
import { optionalEnv } from "@/lib/env";
import { appFonts } from "@/lib/fonts";
import { setSupabaseAccessTokenGetter } from "@/lib/supabase";

void ExpoSplashScreen.preventAutoHideAsync();

function SupabaseAuthBridge({ children }: PropsWithChildren) {
  const { getToken } = useAuth();

  useEffect(() => {
    setSupabaseAccessTokenGetter(async () => {
      if (optionalEnv.clerkSupabaseJwtTemplate) {
        return getToken({ template: optionalEnv.clerkSupabaseJwtTemplate });
      }

      return getToken();
    });

    return () => {
      setSupabaseAccessTokenGetter(async () => null);
    };
  }, [getToken]);

  return children;
}

function AuthGate({ children }: PropsWithChildren) {
  const { isAuthLoaded, isSignedIn } = useAuthAccess();
  const router = useRouter();
  const segments = useSegments();

  const firstSegment = segments[0];
  const isAuthRoute = firstSegment === "(auth)";

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn) {
      return;
    }

    if (isAuthRoute) {
      router.replace("/");
    }
  }, [isAuthLoaded, isSignedIn, isAuthRoute, router]);

  return children;
}

function SavedItemsHydrator() {
  const { isAuthLoaded, isSignedIn, userId } = useAuthAccess();
  const hydrateForUser = useSavedStore((state) => state.hydrateForUser);
  const resetSavedStore = useSavedStore((state) => state.reset);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      resetSavedStore();
      return;
    }

    void hydrateForUser(userId);
  }, [hydrateForUser, isAuthLoaded, isSignedIn, resetSavedStore, userId]);

  return null;
}

function NavigationThemeProvider({ children }: PropsWithChildren) {
  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surfaceLowest,
        text: colors.text,
        border: colors.outline,
        notification: colors.tertiary,
      },
    };
  }, [colors, isDark]);

  return <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  // Subscribing here guarantees the stored appearance preference is applied
  // before the first frame renders.
  useThemeStore((state) => state.preference);

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }

    if (fontError) {
      console.warn("Unable to load app fonts", fontError);
    }

    void ExpoSplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={clerkTokenCache}
    >
      <SupabaseAuthBridge>
        <NavigationThemeProvider>
          <AuthAccessProvider>
            <SavedItemsHydrator />
            <PurchasesBridge />
            <AuthGate>{children}</AuthGate>
          </AuthAccessProvider>
        </NavigationThemeProvider>
      </SupabaseAuthBridge>
    </ClerkProvider>
  );
}
