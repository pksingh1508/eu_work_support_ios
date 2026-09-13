import { useAuth } from "@clerk/expo";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearCachedAuthSnapshot,
  getCachedAuthSnapshot,
  setCachedAuthSnapshot,
} from "@/lib/local-storage";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/with-timeout";

export type UserPlan = "Free" | "PRO";

/**
 * `unknown` while Clerk or the Supabase profile is still loading, so screens
 * can show a skeleton instead of flashing the paywall at Premium members.
 */
export type PlanStatus = "unknown" | "free" | "pro";

export type AuthAccessProfile = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  userPlan: UserPlan;
  cachedAt: number;
};

export type AuthAccessContextValue = {
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null | undefined;
  profile: AuthAccessProfile | null;
  userPlan: UserPlan | null;
  planStatus: PlanStatus;
  /** True only for members whose Supabase profile says `PRO`. */
  hasPremiumAccess: boolean;
  isProfileLoading: boolean;
  /**
   * True when the plan could not be checked: the profile request failed or
   * timed out and nothing is cached. Screens show a retry instead of a
   * skeleton that never ends or a paywall the member does not deserve.
   */
  isPlanUnavailable: boolean;
  refreshProfile: () => Promise<AuthAccessProfile | null>;
};

const defaultUserPlan: UserPlan = "Free";
/** A stalled profile request must not leave gated screens loading forever. */
const PROFILE_FETCH_TIMEOUT_MS = 15000;

const AuthAccessContext = createContext<AuthAccessContextValue | undefined>(
  undefined,
);

export function normalizeUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") {
    return defaultUserPlan;
  }

  return value.trim().toUpperCase() === "PRO" ? "PRO" : defaultUserPlan;
}

function profileFromCachedSnapshot(): AuthAccessProfile | null {
  const snapshot = getCachedAuthSnapshot();

  if (!snapshot.lastSignedIn || !snapshot.userId) {
    return null;
  }

  return {
    userId: snapshot.userId,
    email: snapshot.email,
    firstName: snapshot.firstName,
    lastName: snapshot.lastName,
    imageUrl: snapshot.imageUrl,
    userPlan: normalizeUserPlan(snapshot.userPlan),
    cachedAt: snapshot.cachedAt ?? 0,
  };
}

export function AuthAccessProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [hasProfileError, setHasProfileError] = useState(false);
  const [profile, setProfile] = useState<AuthAccessProfile | null>(() =>
    profileFromCachedSnapshot(),
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setHasProfileError(false);
      return null;
    }

    const cachedProfile = profileFromCachedSnapshot();
    const canUseCachedProfile = cachedProfile?.userId === userId;

    if (canUseCachedProfile) {
      setProfile(cachedProfile);
    }

    setIsProfileLoading(!canUseCachedProfile);

    try {
      const { data, error } = await withTimeout(
        (async () => {
          await supabase.rpc("ensure_user_profile");

          const response = await supabase
            .from("app_users")
            .select("email, first_name, last_name, image_url, user_plan")
            .eq("clerk_user_id", userId)
            .maybeSingle();

          return response;
        })(),
        PROFILE_FETCH_TIMEOUT_MS,
        "Loading your profile took too long.",
      );

      if (error) {
        throw error;
      }

      const nextProfile = {
        userId,
        email: data?.email ?? null,
        firstName: data?.first_name ?? null,
        lastName: data?.last_name ?? null,
        imageUrl: data?.image_url ?? null,
        userPlan: normalizeUserPlan(data?.user_plan),
        cachedAt: Date.now(),
      };

      setCachedAuthSnapshot({
        lastSignedIn: true,
        userId: nextProfile.userId,
        email: nextProfile.email,
        firstName: nextProfile.firstName,
        lastName: nextProfile.lastName,
        imageUrl: nextProfile.imageUrl,
        userPlan: nextProfile.userPlan,
        cachedAt: nextProfile.cachedAt,
      });
      setProfile(nextProfile);
      setHasProfileError(false);

      return nextProfile;
    } catch (error) {
      console.warn("Unable to load Supabase user profile", error);
      // Without a cached profile the plan stays "unknown" and gated screens
      // offer a retry, instead of guessing "Free" and paywalling a member.
      setHasProfileError(true);

      return canUseCachedProfile ? cachedProfile : null;
    } finally {
      setIsProfileLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      clearCachedAuthSnapshot();
      setProfile(null);
      setIsProfileLoading(false);
      setHasProfileError(false);
      return;
    }

    const cachedProfile = profileFromCachedSnapshot();

    if (cachedProfile?.userId === userId) {
      setProfile(cachedProfile);
    } else {
      setProfile(null);
    }

    void refreshProfile();
  }, [isLoaded, isSignedIn, refreshProfile, userId]);

  const activeProfile = userId && profile?.userId === userId ? profile : null;
  const userPlan = activeProfile?.userPlan ?? null;
  const isPlanUnavailable =
    isLoaded && Boolean(isSignedIn) && !activeProfile && hasProfileError && !isProfileLoading;
  const shouldWaitForProfile = Boolean(isSignedIn) && !activeProfile && !hasProfileError;
  const planStatus: PlanStatus = !isLoaded
    ? "unknown"
    : !isSignedIn
      ? "free"
      : !activeProfile
        ? "unknown"
        : userPlan === "PRO"
          ? "pro"
          : "free";

  const value = useMemo(
    () => ({
      isAuthLoaded: isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId,
      profile: activeProfile,
      userPlan,
      planStatus,
      hasPremiumAccess: planStatus === "pro",
      isProfileLoading: isProfileLoading || shouldWaitForProfile,
      isPlanUnavailable,
      refreshProfile,
    }),
    [
      isLoaded,
      isSignedIn,
      userId,
      activeProfile,
      userPlan,
      planStatus,
      isProfileLoading,
      isPlanUnavailable,
      shouldWaitForProfile,
      refreshProfile,
    ],
  );

  return (
    <AuthAccessContext.Provider value={value}>
      {children}
    </AuthAccessContext.Provider>
  );
}

export function useAuthAccess() {
  const value = useContext(AuthAccessContext);

  if (!value) {
    throw new Error("useAuthAccess must be used inside AuthAccessProvider");
  }

  return value;
}
