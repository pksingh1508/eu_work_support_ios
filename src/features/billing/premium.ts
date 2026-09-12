import type { IconName } from "@/components/ui/icon-names";

/** Fallback price shown before (or without) a store-localised price. */
export const PREMIUM_PRICE_LABEL = "$59";
export const PREMIUM_ENTITLEMENT_ID = "premium";
/** App Store / Google Play product identifier (non-consumable). */
export const PREMIUM_PRODUCT_ID = "eu_work_support_premium_lifetime";
/** RevenueCat package identifier for the one-time purchase. */
export const PREMIUM_PACKAGE_ID = "$rc_lifetime";
export const BILLING_ROUTE = "/billing" as const;

export type PremiumFeature = {
  icon: IconName;
  title: string;
  description: string;
};

export const premiumFeatures: readonly PremiumFeature[] = [
  {
    icon: "map",
    title: "Every country guide",
    description: "Full detail pages for all European destinations.",
  },
  {
    icon: "documents",
    title: "All visa and work documents",
    description: "Requirements, costs, timelines and official sources.",
  },
  {
    icon: "bookmark",
    title: "Unlimited saves",
    description: "Bookmark countries and guides for quick access.",
  },
  {
    icon: "search",
    title: "Instant search",
    description: "Find any permit or document in seconds.",
  },
  {
    icon: "infinity",
    title: "Lifetime updates",
    description: "New guides and rule changes, no renewals ever.",
  },
];

export type GatedFeature = "country" | "document" | "save" | "search";

const gatedFeatureCopy: Record<GatedFeature, { title: string; message: string }> = {
  country: {
    title: "Country guides are Premium",
    message:
      "You are on the Free plan. Full country pages, visa routes and documents are included with Premium.",
  },
  document: {
    title: "This guide is Premium",
    message:
      "You are on the Free plan. Detailed visa and work guides are included with Premium.",
  },
  save: {
    title: "Saving is a Premium feature",
    message:
      "You are on the Free plan. Upgrade to Premium to bookmark countries and guides.",
  },
  search: {
    title: "Search is Premium",
    message:
      "You are on the Free plan. Upgrade to Premium to search every guide instantly.",
  },
};

export function getGatedFeatureCopy(feature: GatedFeature, subject?: string | null) {
  const copy = gatedFeatureCopy[feature];

  if (subject && feature === "country") {
    return {
      title: `${subject} guides are Premium`,
      message: `You are on the Free plan. The full ${subject} guide, visa routes and documents are included with Premium.`,
    };
  }

  return copy;
}
