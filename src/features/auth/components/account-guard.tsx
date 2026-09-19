import type { PropsWithChildren } from "react";

import { useAuthAccess } from "@/features/auth/access";
import { UnAuthenticated } from "@/features/auth/components/unauthenticated";

type AccountGuardProps = PropsWithChildren<{
  returnTo?: string;
}>;

/**
 * Guards screens that manage an account (profile details, password, sign
 * out, account deletion). Content and Premium never sit behind it: guests can
 * browse, buy and use Premium without an account (App Store Review
 * Guideline 5.1.1(v)).
 */
export function AccountGuard({ children, returnTo }: AccountGuardProps) {
  const { isAuthLoaded, isSignedIn } = useAuthAccess();

  // Keep the access options available while Clerk restores the session. A slow
  // auth check or profile request must not trap visitors behind a spinner.
  if (!isAuthLoaded || !isSignedIn) {
    return <UnAuthenticated returnTo={returnTo} />;
  }

  return <>{children}</>;
}
