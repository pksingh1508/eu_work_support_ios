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
  PREMIUM_PRICE_LABEL,
  PREMIUM_PRODUCT_ID,
} from "@/features/billing/premium";
import { optionalEnv } from "@/lib/env";
import { UserFacingError } from "@/lib/user-facing-error";

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
  /** Store-localised Premium price (e.g. "59,99 €") once the offer has loaded. */
  priceLabel: string | null;
  setCustomerInfo: (customerInfo: CustomerInfo | null) => void;
  setPriceLabel: (priceLabel: string | null) => void;
};

export const usePurchasesStore = create<PurchasesStoreState>((set) => ({
  isConfigured: false,
  customerInfo: null,
  hasStoreEntitlement: false,
  priceLabel: null,
  setCustomerInfo: (customerInfo) =>
    set({
      customerInfo,
      hasStoreEntitlement: customerInfo ? hasPremiumEntitlement(customerInfo) : false,
    }),
  setPriceLabel: (priceLabel) => set({ priceLabel }),
}));

/**
 * The one price every screen should show. Null until the store has answered,
 * so no screen shows a guessed price next to the real localised one. Builds
 * without a RevenueCat key can never load a price and fall back to the list
 * price.
 */
export function usePremiumPriceLabel() {
  const priceLabel = usePurchasesStore((state) => state.priceLabel);
  return priceLabel ?? (isPurchasesAvailable() ? null : PREMIUM_PRICE_LABEL);
}

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
    usePurchasesStore.getState().setPriceLabel(pkg.product.priceString || null);
    return { kind: "package", package: pkg, priceString: pkg.product.priceString };
  }

  const [product] = await Purchases.getProducts([PREMIUM_PRODUCT_ID]);

  if (product) {
    usePurchasesStore.getState().setPriceLabel(product.priceString || null);
    return { kind: "product", product, priceString: product.priceString };
  }

  return null;
}

/**
 * Warms the offer (and therefore the localised price) right after the SDK is
 * configured, so paywall cards and the Profile row show the store price
 * before the user ever opens Billing. Failures are silent: the Billing tab
 * retries on its own.
 */
export async function prefetchPremiumOffer() {
  if (!isPurchasesAvailable() || usePurchasesStore.getState().priceLabel) {
    return;
  }

  try {
    await fetchPremiumOffer();
  } catch (error) {
    if (__DEV__) {
      console.warn("Unable to prefetch the Premium offer", error);
    }
  }
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

const STORE_UNAVAILABLE_MESSAGE =
  "Purchases are temporarily unavailable. Please try again later.";
const STORE_OFFLINE_MESSAGE =
  "We could not reach the App Store. Check your connection and try again.";
const RECEIPT_MESSAGE =
  "We could not verify the purchase with the App Store. Please try again or use Restore purchase.";
const OTHER_ACCOUNT_MESSAGE =
  "This purchase is linked to another account. Log in with the account you used to buy Premium.";

const { PURCHASES_ERROR_CODE } = Purchases;

/** User-facing copy for RevenueCat / StoreKit error codes. */
const purchaseErrorMessages: Record<string, string> = {
  [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR]:
    "The App Store could not complete the purchase. Please try again in a moment.",
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR]:
    "Purchases are not allowed on this device. Check your Screen Time or parental control settings.",
  [PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR]:
    "The App Store did not accept this purchase. Check your payment method and try again.",
  [PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR]:
    "Premium is not available in your App Store region right now.",
  [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR]:
    "You already own Premium. Use Restore purchase to activate it.",
  [PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR]: OTHER_ACCOUNT_MESSAGE,
  [PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR]: OTHER_ACCOUNT_MESSAGE,
  [PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR]: RECEIPT_MESSAGE,
  [PURCHASES_ERROR_CODE.MISSING_RECEIPT_FILE_ERROR]: RECEIPT_MESSAGE,
  [PURCHASES_ERROR_CODE.NETWORK_ERROR]: STORE_OFFLINE_MESSAGE,
  [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR]: STORE_OFFLINE_MESSAGE,
  [PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR]:
    "The App Store took too long to respond. Please try again.",
  [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR]:
    "Your payment is waiting for approval. Premium will unlock once it is confirmed.",
  [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR]:
    "A purchase is already in progress. Please wait for it to finish.",
  [PURCHASES_ERROR_CODE.INELIGIBLE_ERROR]:
    "This App Store account is not eligible for this purchase.",
  [PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR]: STORE_UNAVAILABLE_MESSAGE,
  [PURCHASES_ERROR_CODE.CONFIGURATION_ERROR]: STORE_UNAVAILABLE_MESSAGE,
  [PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR]: STORE_UNAVAILABLE_MESSAGE,
  [PURCHASES_ERROR_CODE.UNKNOWN_BACKEND_ERROR]: STORE_UNAVAILABLE_MESSAGE,
  [PURCHASES_ERROR_CODE.INVALID_APP_USER_ID_ERROR]: STORE_UNAVAILABLE_MESSAGE,
  [PURCHASES_ERROR_CODE.API_ENDPOINT_BLOCKED]: STORE_UNAVAILABLE_MESSAGE,
};

/**
 * Friendly copy for a failed purchase or restore. Raw SDK text
 * (`message` / `underlyingErrorMessage`) is never shown: unknown codes get
 * the caller's fallback.
 */
export function getPurchaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof UserFacingError) {
    return error.message;
  }

  const code = (error as { code?: string | number } | null)?.code;
  const mapped = code === undefined || code === null ? undefined : purchaseErrorMessages[String(code)];

  return mapped ?? fallback;
}
