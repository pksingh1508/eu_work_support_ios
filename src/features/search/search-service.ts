import { fetchGuestContent } from "@/features/billing/guest-premium";
import { firstRelation, type ContentSource } from "@/features/content/content-types";
import { appStorage } from "@/lib/local-storage";
import { supabase } from "@/lib/supabase";

const RECENT_SEARCHES_KEY = "search.recentQueries";
const MAX_RECENT_SEARCHES = 5;
const SEARCH_LIMIT = 25;
const RESULT_CACHE_LIMIT = 30;

export const MIN_SEARCH_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Starter searches offered while the query is empty. Each one matches a
 * guide title, a document category or a country, so tapping a chip always
 * returns results.
 */
export const suggestedQueries = [
  "Student visa",
  "Health insurance",
  "Residence permit",
  "Universities",
  "Employers",
];

// Mirrored in supabase/functions/guest-premium/index.ts (searchSelect), which
// runs the same matching for guests; keep them in step.
const documentSelect = `
  id,
  title,
  slug,
  short_description,
  is_premium,
  language,
  sort_order,
  countries!inner (
    id,
    name,
    slug,
    flag_emoji,
    popularity_rank,
    is_active
  ),
  document_categories!inner (
    id,
    name,
    slug,
    sort_order
  )
`;

type RelatedCountry = {
  id: string;
  name: string;
  slug: string;
  flag_emoji: string | null;
  popularity_rank: number | null;
};

type RelatedCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
};

type RawSearchDocument = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  is_premium: boolean;
  language: string;
  sort_order: number | null;
  countries: RelatedCountry | RelatedCountry[];
  document_categories: RelatedCategory | RelatedCategory[];
};

export type SearchResult = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  isPremium: boolean;
  sortOrder: number;
  countryName: string;
  countrySlug: string;
  flagEmoji: string | null;
  popularityRank: number;
  categoryName: string;
  categorySlug: string;
  categorySortOrder: number;
};

type MatchLookup = {
  countryIds: string[];
  categoryIds: string[];
};

export function normalizeQuery(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function toIlikePattern(value: string) {
  return `%${normalizeQuery(value).replace(/[%_]/g, "")}%`;
}

/** The user's own recent searches; empty until they have searched. */
export function getStoredRecentSearches(): string[] {
  const stored = appStorage.getString(RECENT_SEARCHES_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  appStorage.set(
    RECENT_SEARCHES_KEY,
    JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)),
  );
}

export function addRecentSearch(searches: string[], query: string) {
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return searches;
  }

  const nextSearches = [
    normalized,
    ...searches.filter(
      (item) => item.toLowerCase() !== normalized.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  saveRecentSearches(nextSearches);
  return nextSearches;
}

export function removeRecentSearch(searches: string[], query: string) {
  const nextSearches = searches.filter((item) => item !== query);
  saveRecentSearches(nextSearches);
  return nextSearches;
}

function mapSearchResult(row: RawSearchDocument): SearchResult | null {
  const country = firstRelation(row.countries);
  const category = firstRelation(row.document_categories);

  if (!country || !category) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description,
    isPremium: row.is_premium,
    sortOrder: row.sort_order ?? 100,
    countryName: country.name,
    countrySlug: country.slug,
    flagEmoji: country.flag_emoji,
    popularityRank: country.popularity_rank ?? 999,
    categoryName: category.name,
    categorySlug: category.slug,
    categorySortOrder: category.sort_order ?? 100,
  };
}

function mergeSearchRows(rows: RawSearchDocument[]) {
  const uniqueRows = new Map<string, RawSearchDocument>();

  rows.forEach((row) => {
    uniqueRows.set(row.id, row);
  });

  return Array.from(uniqueRows.values())
    .map(mapSearchResult)
    .filter((result): result is SearchResult => Boolean(result))
    .sort((left, right) => {
      const popularity = left.popularityRank - right.popularityRank;

      if (popularity !== 0) {
        return popularity;
      }

      const categorySort = left.categorySortOrder - right.categorySortOrder;

      if (categorySort !== 0) {
        return categorySort;
      }

      const documentSort = left.sortOrder - right.sortOrder;

      if (documentSort !== 0) {
        return documentSort;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, SEARCH_LIMIT);
}

async function getMatchedCountryAndCategoryIds(
  pattern: string,
): Promise<MatchLookup> {
  const [countriesResponse, categoriesResponse] = await Promise.all([
    supabase
      .from("countries")
      .select("id")
      .eq("is_active", true)
      .ilike("name", pattern)
      .limit(10),
    supabase
      .from("document_categories")
      .select("id")
      .ilike("name", pattern)
      .limit(10),
  ]);

  if (countriesResponse.error) {
    throw countriesResponse.error;
  }

  if (categoriesResponse.error) {
    throw categoriesResponse.error;
  }

  return {
    countryIds: countriesResponse.data?.map((country) => country.id) ?? [],
    categoryIds: categoriesResponse.data?.map((category) => category.id) ?? [],
  };
}

function publishedDocumentsQuery() {
  return supabase
    .from("country_documents")
    .select(documentSelect)
    .eq("status", "published")
    .eq("language", "en")
    .eq("countries.is_active", true);
}

async function searchPublishedDocumentsUncached(query: string, source: ContentSource) {
  if (source === "guest") {
    const rows = await fetchGuestContent<RawSearchDocument[]>({
      action: "search",
      query: normalizeQuery(query),
    });
    return mergeSearchRows(rows ?? []);
  }

  const pattern = toIlikePattern(query);
  const [documentResponse, matches] = await Promise.all([
    publishedDocumentsQuery().ilike("search_text", pattern).limit(SEARCH_LIMIT),
    getMatchedCountryAndCategoryIds(pattern),
  ]);

  if (documentResponse.error) {
    throw documentResponse.error;
  }

  const extraQueries = [];

  if (matches.countryIds.length > 0) {
    extraQueries.push(
      publishedDocumentsQuery()
        .in("country_id", matches.countryIds)
        .limit(SEARCH_LIMIT),
    );
  }

  if (matches.categoryIds.length > 0) {
    extraQueries.push(
      publishedDocumentsQuery()
        .in("category_id", matches.categoryIds)
        .limit(SEARCH_LIMIT),
    );
  }

  const extraResponses = await Promise.all(extraQueries);
  const extraRows: RawSearchDocument[] = [];

  extraResponses.forEach((response) => {
    if (response.error) {
      throw response.error;
    }

    extraRows.push(...((response.data as RawSearchDocument[] | null) ?? []));
  });

  return mergeSearchRows([
    ...(documentResponse.data ?? []),
    ...extraRows,
  ] as RawSearchDocument[]);
}

/**
 * Small in-memory LRU so revisiting a recent query (or re-typing it) is
 * instant instead of re-hitting Supabase.
 */
const resultCache = new Map<string, SearchResult[]>();

export async function searchPublishedDocuments(query: string, source: ContentSource) {
  const cacheKey = normalizeQuery(query).toLowerCase();
  const cached = resultCache.get(cacheKey);

  if (cached) {
    resultCache.delete(cacheKey);
    resultCache.set(cacheKey, cached);
    return cached;
  }

  const results = await searchPublishedDocumentsUncached(query, source);

  resultCache.set(cacheKey, results);

  if (resultCache.size > RESULT_CACHE_LIMIT) {
    const oldestKey = resultCache.keys().next().value;

    if (oldestKey !== undefined) {
      resultCache.delete(oldestKey);
    }
  }

  return results;
}
