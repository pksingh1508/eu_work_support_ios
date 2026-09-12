import type { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";

import { Screen } from "@/components/ui/screen";
import { LoadingState } from "@/components/ui/state-views";
import { useAuthAccess } from "@/features/auth/access";
import { UnAuthenticated } from "@/features/auth/components/unauthenticated";

type PremiumGuardProps = PropsWithChildren<{
  returnTo?: string;
}>;

export function PremiumGuard({ children, returnTo }: PremiumGuardProps) {
  const { isAuthLoaded, isSignedIn, isProfileLoading } = useAuthAccess();

  if (!isAuthLoaded || isProfileLoading) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <LoadingState label="Loading your account…" />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return <UnAuthenticated returnTo={returnTo} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
  },
});
