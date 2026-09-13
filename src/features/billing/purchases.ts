import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type LogHandler,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from "react-native-purchases";
import { create } from "zustand";

import {
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_PACKAGE_ID,
  PREMIUM_PRODUCT_ID,
} from "@/features/billing/premium";
import { optionalEnv } from "@/lib/env";

/**
 * Thin RevenueCat wrapper. RevenueCat talks to StoreKit 2 for us (products,
 * purchase sheet, receipts, restores) and forwards every entitlement change
 * to the Supabase webhook, which is what flips `app_users.user_plan`.
 *
 * On-device `CustomerInfo` is mirrored into a small store so the UI can react
 * instantly (e.g. purchase made on another device, refund), while Supabase
 * stays the source of truth for content access.
 */

type PurchasesStoreState = {
  isConfigured: boolean;
  customerInfo: CustomerInfo | null;
  /** True when the App Store account owns the Premium entitlement. */
  hasStoreEntitlement: boolean;
  setCustomerInfo: (customerInfo: CustomerInfo | null) => void;
};

export const usePurchasesStore = create<PurchasesStoreState>((set) => ({
  isConfigured: false,
  customerInfo: null,
  hasStoreEntitlement: false,
  setCustomerInfo: (customerInfo) =>
    set({
      customerInfo,
      hasStoreEntitlement: customerInfo ? hasPremiumEntitlement(customerInfo) : false,
    }),
}));

export type PremiumOffer =
  | { kind: "package"; package: PurchasesPackage; priceString: string }
  | { kind: "product"; product: PurchasesStoreProduct; priceString: string };

let configuredApiKey: string | null = null;
let activeAppUserId: string | null = null;
let isListenerAttached = false;

const onCustomerInfoUpdate: CustomerInfoUpdateListener = (customerInfo) => {
  usePurchasesStore.getState().setCustomerInfo(customerInfo);
};

/**
 * The SDK logs a user backing out of the App Store sheet at ERROR level
 * ("🍎‼️ Purchase was cancelled."), and its default handler forwards every
 * ERROR log to `console.error`, which LogBox renders as a red "Console Error"
 * screen in development. Cancelling is not an error for us (see
 * `isPurchaseCancelled`), so route SDK logs ourselves: drop cancellations,
 * keep real problems visible as warnings, stay quiet about the rest in release.
 */
const USER_CANCELLED_LOG = /purchase was cancell?ed|purchasecancellederror/i;

const onSdkLog: LogHandler = (level, message) => {
  if (USER_CANCELLED_LOG.test(message)) {
    return;
  }

  if (level === LOG_LEVEL.ERROR || level === LOG_LEVEL.WARN) {
    console.warn(`[RevenueCat] ${message}`);
    return;
  }

  if (__DEV__) {
    console.log(`[RevenueCat] ${message}`);
  }
};

/** RevenueCat public SDK keys: `appl_` (App Store), `goog_` (Play), `test_` (Test Store). */
const API_KEY_PATTERN = /^(appl|goog|test)_[A-Za-z0-9]{10,}$/;
let hasWarnedAboutKey = false;

function getApiKey() {
  const candidate = Platform.select({
    ios: optionalEnv.revenueCatIosApiKey,
    android: optionalEnv.revenueCatAndroidApiKey,
    default: undefined,
  });

  if (!candidate) {
    return undefined;
  }

  if (!API_KEY_PATTERN.test(candidate)) {
    if (__DEV__ && !hasWarnedAboutKey) {
      hasWarnedAboutKey = true;
      console.warn(
        "Ignoring EXPO_PUBLIC_REVENUECAT_*_API_KEY: expected a RevenueCat public key (appl_… / goog_… / test_…). Purchases are disabled.",
      );
    }

    return undefined;
  }

  return candidate;
}

/** True when a RevenueCat key exists for this platform. */
export function isPurchasesAvailable() {
  return Boolean(getApiKey());
}

export function hasPremiumEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

/**
 * Configures the SDK exactly once per app launch. Safe to call repeatedly.
 * Returns false when no key is set (purchases disabled in this build).
 */
export function configurePurchases(userId: string | null) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return false;
  }

  if (configuredApiKey === apiKey) {
    return true;
  }

  // Must run before configure(): the SDK only installs its console.error
  // default handler when no custom handler has been registered yet.
  Purchases.setLogHandler(onSdkLog);

  if (__DEV__) {
    void Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  configuredApiKey = apiKey;
  activeAppUserId = userId;

  if (!isListenerAttached) {
    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdate);
    isListenerAttached = true;
  }

  usePurchasesStore.setState({ isConfigured: true });
  return true;
}

/**
 * Keeps the RevenueCat app user id equal to the Clerk user id (so the
 * webhook can map purchases to `app_users`) and logs out on sign-out.
 */
export async function syncPurchasesUser(userId: string | null, email?: string | null) {
  if (!configurePurchases(userId)) {
    return;
  }

  if (userId && activeAppUserId !== userId) {
    const { customerInfo } = await Purchases.logIn(userId);
    activeAppUserId = userId;
    usePurchasesStore.getState().setCustomerInfo(customerInfo);
  } else if (!userId && activeAppUserId) {
    const customerInfo = await Purchases.logOut();
    activeAppUserId = null;
    usePurchasesStore.getState().setCustomerInfo(customerInfo);
  } else if (userId) {
    await refreshCustomerInfo();
  }

  if (userId && email) {
    await Purchases.setEmail(email);
  }
}

export async function refreshCustomerInfo() {
  const customerInfo = await Purchases.getCustomerInfo();
  usePurchasesStore.getState().setCustomerInfo(customerInfo);
  return customerInfo;
}

/**
 * Finds the Premium offer: the lifetime package of the current offering, or
 * (when offerings are not configured yet) the store product itself.
 */
export async function fetchPremiumOffer(): Promise<PremiumOffer | null> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  const pkg =
    offering?.lifetime ??
    offering?.availablePackages.find((item) => item.identifier === PREMIUM_PACKAGE_ID) ??
    offering?.availablePackages.find(
      (item) => item.product.identifier === PREMIUM_PRODUCT_ID,
    ) ??
    null;

  if (pkg) {
    return { kind: "package", package: pkg, priceString: pkg.product.priceString };
  }

  const [product] = await Purchases.getProducts([PREMIUM_PRODUCT_ID]);

  if (product) {
    return { kind: "product", product, priceString: product.priceString };
  }

  return null;
}

export async function purchasePremium(offer: PremiumOffer) {
  const { customerInfo } =
    offer.kind === "package"
      ? await Purchases.purchasePackage(offer.package)
      : await Purchases.purchaseStoreProduct(offer.product);

  usePurchasesStore.getState().setCustomerInfo(customerInfo);
  return hasPremiumEntitlement(customerInfo);
}

export async function restorePremium() {
  const customerInfo = await Purchases.restorePurchases();
  usePurchasesStore.getState().setCustomerInfo(customerInfo);
  return hasPremiumEntitlement(customerInfo);
}

export function isPurchaseCancelled(error: unknown) {
  return Boolean((error as { userCancelled?: boolean | null })?.userCancelled);
}

export function getPurchaseErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { message?: string; underlyingErrorMessage?: string };
  return candidate?.message || candidate?.underlyingErrorMessage || fallback;
}
