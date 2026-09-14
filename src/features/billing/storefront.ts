/**
 * Apple prices every purchase for the storefront of the Apple Account (or
 * sandbox tester) signed into the App Store, never for the device's physical
 * location, IP address, SIM or language. StoreKit reports that storefront
 * through `Purchases.getStorefront()` as an ISO 3166-1 alpha-3 code, and the
 * `priceString` it returns is already the amount Apple will charge there.
 *
 * The names below only caption the price ("Price shown for the India App
 * Store in INR"), so a user, or a tester with a foreign sandbox account, can
 * see which storefront the price belongs to. Hermes has no
 * `Intl.DisplayNames`, hence the static list of App Store territories.
 */
const STOREFRONT_COUNTRY_NAMES: Record<string, string> = {
  // United States and Canada
  CAN: "Canada",
  USA: "United States",
  // Europe
  ALB: "Albania",
  AUT: "Austria",
  BLR: "Belarus",
  BEL: "Belgium",
  BIH: "Bosnia and Herzegovina",
  BGR: "Bulgaria",
  HRV: "Croatia",
  CYP: "Cyprus",
  CZE: "Czechia",
  DNK: "Denmark",
  EST: "Estonia",
  FIN: "Finland",
  FRA: "France",
  DEU: "Germany",
  GRC: "Greece",
  HUN: "Hungary",
  ISL: "Iceland",
  IRL: "Ireland",
  ITA: "Italy",
  XKS: "Kosovo",
  LVA: "Latvia",
  LTU: "Lithuania",
  LUX: "Luxembourg",
  MLT: "Malta",
  MDA: "Moldova",
  MNE: "Montenegro",
  NLD: "Netherlands",
  MKD: "North Macedonia",
  NOR: "Norway",
  POL: "Poland",
  PRT: "Portugal",
  ROU: "Romania",
  RUS: "Russia",
  SRB: "Serbia",
  SVK: "Slovakia",
  SVN: "Slovenia",
  ESP: "Spain",
  SWE: "Sweden",
  CHE: "Switzerland",
  UKR: "Ukraine",
  GBR: "United Kingdom",
  // Africa, Middle East and India
  DZA: "Algeria",
  AGO: "Angola",
  ARM: "Armenia",
  AZE: "Azerbaijan",
  BHR: "Bahrain",
  BEN: "Benin",
  BWA: "Botswana",
  BFA: "Burkina Faso",
  CMR: "Cameroon",
  CPV: "Cape Verde",
  TCD: "Chad",
  CIV: "Côte d'Ivoire",
  COD: "Democratic Republic of the Congo",
  EGY: "Egypt",
  SWZ: "Eswatini",
  GAB: "Gabon",
  GMB: "Gambia",
  GEO: "Georgia",
  GHA: "Ghana",
  GIN: "Guinea",
  GNB: "Guinea-Bissau",
  IND: "India",
  IRQ: "Iraq",
  ISR: "Israel",
  JOR: "Jordan",
  KEN: "Kenya",
  KWT: "Kuwait",
  LBN: "Lebanon",
  LBR: "Liberia",
  LBY: "Libya",
  MDG: "Madagascar",
  MWI: "Malawi",
  MLI: "Mali",
  MRT: "Mauritania",
  MUS: "Mauritius",
  MAR: "Morocco",
  MOZ: "Mozambique",
  NAM: "Namibia",
  NER: "Niger",
  NGA: "Nigeria",
  OMN: "Oman",
  QAT: "Qatar",
  COG: "Republic of the Congo",
  RWA: "Rwanda",
  STP: "São Tomé and Príncipe",
  SAU: "Saudi Arabia",
  SEN: "Senegal",
  SYC: "Seychelles",
  SLE: "Sierra Leone",
  ZAF: "South Africa",
  TZA: "Tanzania",
  TUN: "Tunisia",
  TUR: "Türkiye",
  UGA: "Uganda",
  ARE: "United Arab Emirates",
  YEM: "Yemen",
  ZMB: "Zambia",
  ZWE: "Zimbabwe",
  // Asia Pacific
  AFG: "Afghanistan",
  AUS: "Australia",
  BTN: "Bhutan",
  BRN: "Brunei",
  KHM: "Cambodia",
  CHN: "China mainland",
  FJI: "Fiji",
  HKG: "Hong Kong",
  IDN: "Indonesia",
  JPN: "Japan",
  KAZ: "Kazakhstan",
  KOR: "South Korea",
  KGZ: "Kyrgyzstan",
  LAO: "Laos",
  MAC: "Macao",
  MYS: "Malaysia",
  MDV: "Maldives",
  FSM: "Micronesia",
  MNG: "Mongolia",
  MMR: "Myanmar",
  NRU: "Nauru",
  NPL: "Nepal",
  NZL: "New Zealand",
  PAK: "Pakistan",
  PLW: "Palau",
  PNG: "Papua New Guinea",
  PHL: "Philippines",
  SGP: "Singapore",
  SLB: "Solomon Islands",
  LKA: "Sri Lanka",
  TWN: "Taiwan",
  TJK: "Tajikistan",
  THA: "Thailand",
  TON: "Tonga",
  TKM: "Turkmenistan",
  UZB: "Uzbekistan",
  VUT: "Vanuatu",
  VNM: "Vietnam",
  // Latin America and the Caribbean
  AIA: "Anguilla",
  ATG: "Antigua and Barbuda",
  ARG: "Argentina",
  BHS: "Bahamas",
  BRB: "Barbados",
  BLZ: "Belize",
  BMU: "Bermuda",
  BOL: "Bolivia",
  BRA: "Brazil",
  VGB: "British Virgin Islands",
  CYM: "Cayman Islands",
  CHL: "Chile",
  COL: "Colombia",
  CRI: "Costa Rica",
  DMA: "Dominica",
  DOM: "Dominican Republic",
  ECU: "Ecuador",
  SLV: "El Salvador",
  GRD: "Grenada",
  GTM: "Guatemala",
  GUY: "Guyana",
  HND: "Honduras",
  JAM: "Jamaica",
  MEX: "Mexico",
  MSR: "Montserrat",
  NIC: "Nicaragua",
  PAN: "Panama",
  PRY: "Paraguay",
  PER: "Peru",
  KNA: "St. Kitts and Nevis",
  LCA: "St. Lucia",
  VCT: "St. Vincent and the Grenadines",
  SUR: "Suriname",
  TTO: "Trinidad and Tobago",
  TCA: "Turks and Caicos Islands",
  URY: "Uruguay",
  VEN: "Venezuela",
};

/** English name of an App Store storefront, or null for an unknown code. */
export function getStorefrontCountryName(countryCode: string | null | undefined) {
  if (!countryCode) {
    return null;
  }

  return STOREFRONT_COUNTRY_NAMES[countryCode.trim().toUpperCase()] ?? null;
}

/**
 * One-line caption for a price, naming the storefront (and currency) Apple
 * priced it for, e.g. "Price shown for the Poland App Store in PLN." Null
 * when neither is known, so the caption is simply omitted.
 */
export function describePriceStorefront(
  countryCode: string | null | undefined,
  currencyCode: string | null | undefined,
) {
  const country = getStorefrontCountryName(countryCode);
  const currency = currencyCode?.trim().toUpperCase() || null;

  if (country && currency) {
    return `Price shown for the ${country} App Store in ${currency}.`;
  }

  if (country) {
    return `Price shown for the ${country} App Store.`;
  }

  if (currency) {
    return `Price shown in ${currency} for your App Store account.`;
  }

  return null;
}
