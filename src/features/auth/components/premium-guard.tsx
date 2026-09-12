import type { PropsWithChildren } from "react";

import { useAuthAccess } from "@/features/auth/access";
import { UnAuthenticated } from "@/features/auth/components/unauthenticated";

type PremiumGuardProps = PropsWithChildren<{
  returnTo?: string;
}>;

export function PremiumGuard({ children, returnTo }: PremiumGuardProps) {
  const { isAuthLoaded, isSignedIn } = useAuthAccess();

  // Keep the access options available while Clerk restores the session. A slow
  // auth check or profile request must not trap visitors behind a spinner.
  if (!isAuthLoaded || !isSignedIn) {
    return <UnAuthenticated returnTo={returnTo} />;
  }

  return <>{children}</>;
}
