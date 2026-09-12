import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

import { PREMIUM_ENTITLEMENT_ID, PREMIUM_PACKAGE_ID } from "@/features/billing/premium";
import { optionalEnv } from "@/lib/env";

let configuredApiKey: string | null = null;
let activeAppUserId: string | null = null;

function getApiKey() {
  return Platform.select({
    ios: optionalEnv.revenueCatIosApiKey,
    android: optionalEnv.revenueCatAndroidApiKey,
    default: undefined,
  });
}

/** True when a RevenueCat key exists for this platform. */
export function isPurchasesAvailable() {
  return Boolean(getApiKey());
}

/**
 * Configures the SDK once and keeps the RevenueCat app user id aligned with
 * the Clerk user id so the webhook can mirror the entitlement into Supabase.
 */
export async function ensurePurchasesReady(userId: string | null) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return false;
  }

  if (configuredApiKey !== apiKey) {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.WARN);
    }

    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
    configuredApiKey = apiKey;
    activeAppUserId = userId;
    return true;
  }

  if (userId && activeAppUserId !== userId) {
    await Purchases.logIn(userId);
    activeAppUserId = userId;
  }

  return true;
}

export async function fetchPremiumPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;

  if (!offering) {
    return null;
  }

  return (
    offering.lifetime ??
    offering.availablePackages.find((item) => item.identifier === PREMIUM_PACKAGE_ID) ??
    offering.availablePackages[0] ??
    null
  );
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

export async function purchasePremium(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return hasPremiumEntitlement(customerInfo);
}

export async function restorePremium() {
  const customerInfo = await Purchases.restorePurchases();
  return hasPremiumEntitlement(customerInfo);
}

export function isPurchaseCancelled(error: unknown) {
  return Boolean((error as { userCancelled?: boolean | null })?.userCancelled);
}

export function getPurchaseErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { message?: string; underlyingErrorMessage?: string };
  return candidate?.message || candidate?.underlyingErrorMessage || fallback;
}
