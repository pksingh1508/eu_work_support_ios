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

type PremiumOfferPrice = {
  /** Apple's formatted price for the account's storefront, e.g. "249,99 zł". */
  priceString: string;
  /** ISO 4217 code of `priceString`, e.g. "PLN". */
  currencyCode: string;
  /**
   * App Store storefront the price was fetched for (ISO 3166-1 alpha-3, e.g.
   * "IND"), or null when StoreKit could not tell. Apple prices by the
   * storefront of the Apple Account signed into the App Store, never by the
   * device's location, so this is the only "country" that matters for price.
   */
  storefrontCountryCode: string | null;
};

export type PremiumOffer =
  | (PremiumOfferPrice & { kind: "package"; package: PurchasesPackage })
  | (PremiumOfferPrice & { kind: "product"; product: PurchasesStoreProduct });

/** Progress of the Premium offer load, so paywalls never guess a price. */
export type OfferStatus = "idle" | "loading" | "ready" | "error";

type PurchasesStoreState = {
  isConfigured: boolean;
  customerInfo: CustomerInfo | null;
  /** True when the App Store account owns the Premium entitlement. */
  hasStoreEntitlement: boolean;
  /**
   * The Premium package (or bare product) exactly as the store returned it,
   * carrying Apple's localised `priceString` (e.g. "249,99 zł"). Every screen
   * shows this price, and `purchasePremium` buys this very object.
   */
  offer: PremiumOffer | null;
  offerStatus: OfferStatus;
  /** User-facing reason the offer could not be loaded. */
  offerError: string | null;
  /**
   * Storefront of the Apple Account currently signed into the App Store
   * (ISO 3166-1 alpha-3), read from StoreKit at launch and whenever the app
   * returns to the foreground. When it differs from the storefront the offer
   * was priced for, the offer is reloaded so the price on screen always
   * belongs to the storefront Apple will charge.
   */
  storefrontCountryCode: string | null;
  setCustomerInfo: (customerInfo: CustomerInfo | null) => void;
};

export const usePurchasesStore = create<PurchasesStoreState>((set) => ({
  isConfigured: false,
  customerInfo: null,
  hasStoreEntitlement: false,
  offer: null,
  offerStatus: "idle",
  offerError: null,
  storefrontCountryCode: null,
  setCustomerInfo: (customerInfo) =>
    set({
      customerInfo,
      hasStoreEntitlement: customerInfo ? hasPremiumEntitlement(customerInfo) : false,
    }),
}));

/**
 * The one price any screen may show: Apple's localised price of the loaded
 * offer. Null until the store has answered (still loading, failed, or
 * purchases disabled in this build), so no screen ever shows a guessed list
 * price in place of the real storefront one.
 */
export function usePremiumPriceLabel() {
  return usePurchasesStore((state) => state.offer?.priceString || null);
}

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
 * Reads the App Store storefront, the "country" Apple prices for, from
 * StoreKit. It is a local, instant lookup with no permission prompt, unlike
 * IP or GPS geolocation, which could disagree with the account Apple charges.
 * Never throws; null when StoreKit cannot tell (no Apple Account signed in).
 */
export async function refreshStorefront(): Promise<string | null> {
  if (!usePurchasesStore.getState().isConfigured) {
    return null;
  }

  try {
    const storefront = await Purchases.getStorefront();
    const countryCode = storefront?.countryCode?.trim().toUpperCase() || null;
    usePurchasesStore.setState({ storefrontCountryCode: countryCode });
    return countryCode;
  } catch (error) {
    if (__DEV__) {
      console.warn("Unable to read the App Store storefront", error);
    }

    return usePurchasesStore.getState().storefrontCountryCode;
  }
}

const OFFER_LOAD_FAILED_MESSAGE =
  "We could not load the Premium price from the App Store. Please try again.";
export const OFFER_UNAVAILABLE_MESSAGE =
  "The Premium product is not available right now. Please try again later.";

/** Records a failed offer load so paywalls show an error instead of a price. */
export function markOfferFailed(error: unknown) {
  usePurchasesStore.setState({
    offerStatus: "error",
    offerError: getPurchaseErrorMessage(error, OFFER_LOAD_FAILED_MESSAGE),
  });
}

/**
 * Finds the Premium offer: the lifetime package of the current offering, or
 * (when offerings are not configured yet) the store product itself. Progress
 * is mirrored into the store so paywalls show a spinner or an error while
 * the price is unknown. Store / network failures are rethrown for callers
 * that need them (the purchase button surfaces them as a toast).
 */
export async function fetchPremiumOffer(): Promise<PremiumOffer | null> {
  usePurchasesStore.setState({ offerStatus: "loading", offerError: null });

  let offer: PremiumOffer | null;

  try {
    offer = await resolvePremiumOffer();
  } catch (error) {
    markOfferFailed(error);
    throw error;
  }

  if (offer) {
    usePurchasesStore.setState({ offer, offerStatus: "ready", offerError: null });
  } else {
    usePurchasesStore.setState({
      offer: null,
      offerStatus: "error",
      offerError: OFFER_UNAVAILABLE_MESSAGE,
    });
  }

  return offer;
}

async function resolvePremiumOffer(): Promise<PremiumOffer | null> {
  // Read the storefront alongside the offerings so the price and the
  // storefront it belongs to are captured at the same moment.
  const [offerings, storefrontCountryCode] = await Promise.all([
    Purchases.getOfferings(),
    refreshStorefront(),
  ]);
  const offering = offerings.current;
  const pkg =
    offering?.lifetime ??
    offering?.availablePackages.find((item) => item.identifier === PREMIUM_PACKAGE_ID) ??
    offering?.availablePackages.find(
      (item) => item.product.identifier === PREMIUM_PRODUCT_ID,
    ) ??
    null;

  if (pkg) {
    return {
      kind: "package",
      package: pkg,
      priceString: pkg.product.priceString,
      currencyCode: pkg.product.currencyCode,
      storefrontCountryCode,
    };
  }

  const [product] = await Purchases.getProducts([PREMIUM_PRODUCT_ID]);

  return product
    ? {
        kind: "product",
        product,
        priceString: product.priceString,
        currencyCode: product.currencyCode,
        storefrontCountryCode,
      }
    : null;
}

/**
 * Loads the offer (and therefore the localised price) right after the SDK is
 * configured, so paywall cards and the Profile row show the store price
 * before the user ever opens Billing, and reloads it whenever the App Store
 * storefront no longer matches the one the price was fetched for (the user
 * switched Apple Account or its country while the app was in the
 * background). Failures are silent: the Billing tab retries on its own.
 */
export async function ensurePremiumOffer() {
  // The foreground check can fire before the launch sync has configured the
  // SDK; the sync calls this again as soon as it has.
  if (!isPurchasesAvailable() || !usePurchasesStore.getState().isConfigured) {
    return;
  }

  const storefrontCountryCode = await refreshStorefront();
  const { offer, offerStatus } = usePurchasesStore.getState();
  const isOfferCurrent =
    offer !== null &&
    (storefrontCountryCode === null || offer.storefrontCountryCode === storefrontCountryCode);

  if (offerStatus === "loading" || isOfferCurrent) {
    return;
  }

  try {
    await fetchPremiumOffer();
  } catch (error) {
    if (__DEV__) {
      console.warn("Unable to load the Premium offer", error);
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
