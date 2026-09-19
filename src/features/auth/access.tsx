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

import type { ContentSource } from "@/features/content/content-types";
import { useGuestPremiumStore, verifyGuestPremium } from "@/features/billing/guest-premium";
import { usePurchasesStore } from "@/features/billing/purchases";
import {
  clearCachedAuthSnapshot,
  getCachedAuthSnapshot,
  setCachedAuthSnapshot,
} from "@/lib/local-storage";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/with-timeout";

export type UserPlan = "Free" | "PRO";

/**
 * `unknown` while Clerk, the Supabase profile or a guest's purchase check is
 * still loading, so screens can show a skeleton instead of flashing the
 * paywall at people who own Premium.
 */
export type PlanStatus = "unknown" | "free" | "pro";

/**
 * Saved items of a guest (no account) live only on this device under this
 * owner id; members' saves are stored in Supabase under their Clerk id.
 */
export const GUEST_OWNER_ID = "guest";

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
  /**
   * Using the app without an account. Guests can buy and use Premium on this
   * device; an account is optional and only adds access on other devices.
   */
  isGuest: boolean;
  userId: string | null | undefined;
  profile: AuthAccessProfile | null;
  userPlan: UserPlan | null;
  planStatus: PlanStatus;
  /**
   * Members: their Supabase profile says `PRO`. Guests: the server confirmed
   * this device's App Store purchase of Premium.
   */
  hasPremiumAccess: boolean;
  /** How Premium content is read for this person (see `ContentSource`). */
  contentSource: ContentSource;
  /**
   * Whose saved items to show: the Clerk user id for members, `GUEST_OWNER_ID`
   * (device-only saves) for guests, null while Clerk is loading.
   */
  savedItemsOwnerId: string | null;
  isProfileLoading: boolean;
  /**
   * True when the plan could not be checked: the profile request (members)
   * or the purchase check (guests who own Premium) failed or timed out and
   * nothing is cached. Screens show a retry instead of a skeleton that never
   * ends or a paywall the person does not deserve.
   */
  isPlanUnavailable: boolean;
  refreshProfile: () => Promise<AuthAccessProfile | null>;
  /** Re-checks the plan: the profile for members, the purchase for guests. */
  refreshPlan: () => Promise<void>;
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
  const guestStatus = useGuestPremiumStore((state) => state.status);
  const hasStoreEntitlement = usePurchasesStore((state) => state.hasStoreEntitlement);
  const hasCustomerInfo = usePurchasesStore((state) => state.customerInfo !== null);
  const isMovingGuestPurchase = usePurchasesStore((state) => state.isMovingGuestPurchase);
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
  const isGuest = isLoaded && !isSignedIn;
  // A guest's plan comes from the server's check of this device's purchase.
  // While that check runs (or when it failed) for a device whose App Store
  // account owns Premium, the plan is unknown rather than Free. A check that
  // starts before RevenueCat has reported (an expired token at launch) is
  // unknown too, so a guest who owns Premium never sees the paywall flash.
  const guestPlanStatus: PlanStatus =
    guestStatus === "active"
      ? "pro"
      : (guestStatus === "checking" && (hasStoreEntitlement || !hasCustomerInfo)) ||
          (guestStatus === "error" && hasStoreEntitlement)
        ? "unknown"
        : "free";
  const isPlanUnavailable = isGuest
    ? guestStatus === "error" && hasStoreEntitlement
    : isLoaded && Boolean(isSignedIn) && !activeProfile && hasProfileError && !isProfileLoading;
  const shouldWaitForProfile = Boolean(isSignedIn) && !activeProfile && !hasProfileError;
  const planStatus: PlanStatus = !isLoaded
    ? "unknown"
    : !isSignedIn
      ? guestPlanStatus
      : !activeProfile
        ? "unknown"
        : userPlan === "PRO"
          ? "pro"
          : isMovingGuestPurchase
            ? "unknown"
            : "free";
  const contentSource: ContentSource = isSignedIn ? "member" : "guest";
  const savedItemsOwnerId = !isLoaded ? null : isSignedIn ? (userId ?? null) : GUEST_OWNER_ID;

  const refreshPlan = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn) {
      await refreshProfile();
      return;
    }

    await verifyGuestPremium({ force: true });
  }, [isLoaded, isSignedIn, refreshProfile]);

  const value = useMemo(
    () => ({
      isAuthLoaded: isLoaded,
      isSignedIn: Boolean(isSignedIn),
      isGuest,
      userId,
      profile: activeProfile,
      userPlan,
      planStatus,
      hasPremiumAccess: planStatus === "pro",
      contentSource,
      savedItemsOwnerId,
      isProfileLoading: isProfileLoading || shouldWaitForProfile,
      isPlanUnavailable,
      refreshProfile,
      refreshPlan,
    }),
    [
      isLoaded,
      isSignedIn,
      isGuest,
      userId,
      activeProfile,
      userPlan,
      planStatus,
      contentSource,
      savedItemsOwnerId,
      isProfileLoading,
      isPlanUnavailable,
      shouldWaitForProfile,
      refreshProfile,
      refreshPlan,
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
