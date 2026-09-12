export const europeanCountryNames = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
] as const;

export type CountryName = (typeof europeanCountryNames)[number];

export const popularDestinations = ["France", "Germany", "Greece"] as const;

export type PopularDestination = (typeof popularDestinations)[number];

export const topRated = [
  "Poland",
  "Portugal",
  "Romania",
  "Norway",
  "Slovakia",
] as const;

export const easiestVisaCountries = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Malta",
] as const;

export type CountryDetails = {
  code: string;
  summary: string;
  demand: string;
};

export const countryDetails: Record<CountryName, CountryDetails> = {
  Austria: {
    code: "at",
    summary: "High quality of life with skilled worker routes.",
    demand: "Skilled route",
  },
  Belgium: {
    code: "be",
    summary: "Central EU base with multilingual job markets.",
    demand: "EU hub",
  },
  Bulgaria: {
    code: "bg",
    summary: "Lower living costs and growing tech opportunities.",
    demand: "Budget friendly",
  },
  Croatia: {
    code: "hr",
    summary: "Coastal lifestyle with work and residence options.",
    demand: "Coastal jobs",
  },
  "Czech Republic": {
    code: "cz",
    summary: "Strong manufacturing and IT job market.",
    demand: "Work permits",
  },
  Denmark: {
    code: "dk",
    summary: "Stable work culture and high salary potential.",
    demand: "High salary",
  },
  Estonia: {
    code: "ee",
    summary: "Digital-first country with startup visa options.",
    demand: "Startup friendly",
  },
  Finland: {
    code: "fi",
    summary: "Clean, calm, and strong for skilled professionals.",
    demand: "Talent routes",
  },
  France: {
    code: "fr",
    summary: "Tech visa program active.",
    demand: "Tech visa",
  },
  Germany: {
    code: "de",
    summary: "Leading tech hub with streamlined visa options.",
    demand: "High demand",
  },
  Greece: {
    code: "gr",
    summary: "Helpful routes for work, study, and long stays.",
    demand: "Fresh guide",
  },
  Hungary: {
    code: "hu",
    summary: "Central location with accessible residence options.",
    demand: "Central Europe",
  },
  Iceland: {
    code: "is",
    summary: "Small market with unique skilled work needs.",
    demand: "Niche roles",
  },
  Italy: {
    code: "it",
    summary: "Culture-rich destination with annual work quotas.",
    demand: "Quota route",
  },
  Latvia: {
    code: "lv",
    summary: "Baltic destination with practical residence pathways.",
    demand: "Baltic route",
  },
  Liechtenstein: {
    code: "li",
    summary: "Small, premium labor market with strict permits.",
    demand: "Limited permits",
  },
  Lithuania: {
    code: "lt",
    summary: "Growing tech sector and Baltic work opportunities.",
    demand: "Tech growth",
  },
  Luxembourg: {
    code: "lu",
    summary: "Finance-led market with strong salaries.",
    demand: "Finance hub",
  },
  Malta: {
    code: "mt",
    summary: "English-friendly island with service jobs.",
    demand: "English friendly",
  },
  Netherlands: {
    code: "nl",
    summary: "Excellent work-life balance.",
    demand: "Top rated",
  },
  Norway: {
    code: "no",
    summary: "High income destination with skilled job demand.",
    demand: "High income",
  },
  Poland: {
    code: "pl",
    summary: "Fast-growing market with clear work permit routes.",
    demand: "Fast growth",
  },
  Portugal: {
    code: "pt",
    summary: "Popular for remote work and residence planning.",
    demand: "Remote work",
  },
  Romania: {
    code: "ro",
    summary: "Growing EU market with accessible cost of living.",
    demand: "Growing market",
  },
  Slovakia: {
    code: "sk",
    summary: "Manufacturing and service jobs in central Europe.",
    demand: "Industry jobs",
  },
  Slovenia: {
    code: "si",
    summary: "Compact EU destination with quality living.",
    demand: "Quality life",
  },
  Spain: {
    code: "es",
    summary: "Popular for study, work, and digital nomad plans.",
    demand: "Popular choice",
  },
};

export const popularDestinationTaglines: Record<PopularDestination, string> = {
  France: "Tech visa program active.",
  Germany: "Leading tech hub with visa routes.",
  Greece: "Fresh work and study routes.",
};

export const popularDestinationImages: Record<PopularDestination, string> = {
  France:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
  Germany:
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=900&q=80",
  Greece:
    "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=900&q=80",
};

export function getCountrySlug(country: string) {
  return country
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const countryNameBySlug = new Map<string, CountryName>(
  europeanCountryNames.map((name) => [getCountrySlug(name), name]),
);

/** Display name for a slug when the country is one we ship offline. */
export function getCountryNameBySlug(slug: string | null | undefined) {
  return slug ? (countryNameBySlug.get(slug) ?? null) : null;
}

const countryCodeBySlug = new Map<string, string>(
  europeanCountryNames.map((name) => [
    getCountrySlug(name),
    countryDetails[name].code,
  ]),
);

/**
 * Resolves the ISO code for a Supabase country slug so screens can render a
 * raster flag instead of an emoji when the country is one we ship offline.
 */
export function getCountryCodeBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return countryCodeBySlug.get(slug) ?? null;
}
