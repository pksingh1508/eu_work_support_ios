import {
  firstRelation,
  normalizeContentJson,
  type ContentJson,
} from "@/features/content/content-types";
import { supabase } from "@/lib/supabase";

const countrySelect = `
  id,
  slug,
  name,
  flag_emoji,
  short_description,
  popularity_rank,
  official_url,
  official_immigration_url,
  last_reviewed_at,
  country_documents (
    id,
    title,
    slug,
    short_description,
    intro,
    content_json,
    is_premium,
    tags,
    sort_order,
    language,
    status,
    document_categories (
      id,
      name,
      slug,
      icon,
      sort_order
    )
  )
`;

type DocumentCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number | null;
};

type RawCountryDocument = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  intro: string | null;
  content_json: unknown;
  is_premium: boolean;
  tags: string[] | null;
  sort_order: number | null;
  language: string;
  status: string;
  document_categories: DocumentCategory | DocumentCategory[] | null;
};

type CountryResponse = {
  id: string;
  slug: string;
  name: string;
  flag_emoji: string | null;
  short_description: string | null;
  popularity_rank: number | null;
  official_url: string | null;
  official_immigration_url: string | null;
  last_reviewed_at: string | null;
  country_documents: RawCountryDocument[] | null;
};

export type CountryDocument = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  intro: string | null;
  contentJson: ContentJson;
  isPremium: boolean;
  sortOrder: number;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string | null;
  categorySortOrder: number;
};

export type Country = {
  id: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  shortDescription: string | null;
  popularityRank: number | null;
  officialUrl: string | null;
  officialImmigrationUrl: string | null;
  lastReviewedAt: string | null;
  documents: CountryDocument[];
};

function mapCountryResponse(row: CountryResponse): Country {
  const documents = (row.country_documents ?? [])
    .filter(
      (document) =>
        document.status === "published" && document.language === "en",
    )
    .map((document) => {
      const category = firstRelation(document.document_categories);

      return {
        id: document.id,
        title: document.title,
        slug: document.slug,
        shortDescription: document.short_description,
        intro: document.intro,
        contentJson: normalizeContentJson(document.content_json),
        isPremium: document.is_premium,
        sortOrder: document.sort_order ?? 100,
        categoryName: category?.name ?? "Guide",
        categorySlug: category?.slug ?? "guide",
        categoryIcon: category?.icon ?? null,
        categorySortOrder: category?.sort_order ?? 100,
      };
    })
    .sort((left, right) => {
      const categorySort = left.categorySortOrder - right.categorySortOrder;

      if (categorySort !== 0) {
        return categorySort;
      }

      const documentSort = left.sortOrder - right.sortOrder;

      if (documentSort !== 0) {
        return documentSort;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    flagEmoji: row.flag_emoji,
    shortDescription: row.short_description,
    popularityRank: row.popularity_rank,
    officialUrl: row.official_url,
    officialImmigrationUrl: row.official_immigration_url,
    lastReviewedAt: row.last_reviewed_at,
    documents,
  };
}

export async function fetchCountry(slug: string) {
  const { data, error } = await supabase
    .from("countries")
    .select(countrySelect)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("country_documents.status", "published")
    .eq("country_documents.language", "en")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCountryResponse(data as CountryResponse) : null;
}
