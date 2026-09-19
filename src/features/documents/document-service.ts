import { fetchGuestContent } from "@/features/billing/guest-premium";
import {
  firstRelation,
  normalizeContentJson,
  type ContentJson,
  type ContentSource,
} from "@/features/content/content-types";
import { supabase } from "@/lib/supabase";

// Mirrored in supabase/functions/guest-premium/index.ts; keep them in step.
const documentSelect = `
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
  countries!inner (
    id,
    name,
    slug,
    flag_emoji,
    short_description,
    is_active
  ),
  document_categories!inner (
    id,
    name,
    slug,
    icon,
    sort_order
  )
`;

type RelatedCountry = {
  id: string;
  name: string;
  slug: string;
  flag_emoji: string | null;
  short_description: string | null;
  is_active: boolean;
};

type RelatedCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number | null;
};

type RawDocument = {
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
  countries: RelatedCountry | RelatedCountry[] | null;
  document_categories: RelatedCategory | RelatedCategory[] | null;
};

export type VisaDocument = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  intro: string | null;
  contentJson: ContentJson;
  isPremium: boolean;
  tags: string[];
  countryName: string;
  countrySlug: string;
  countryFlagEmoji: string | null;
  countryDescription: string | null;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string | null;
};

function mapDocument(row: RawDocument): VisaDocument | null {
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
    intro: row.intro,
    contentJson: normalizeContentJson(row.content_json),
    isPremium: row.is_premium,
    tags: row.tags ?? [],
    countryName: country.name,
    countrySlug: country.slug,
    countryFlagEmoji: country.flag_emoji,
    countryDescription: country.short_description,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryIcon: category.icon,
  };
}

export async function fetchVisaDocument(id: string, source: ContentSource) {
  if (source === "guest") {
    const row = await fetchGuestContent<RawDocument | null>({ action: "document", id });
    return row ? mapDocument(row) : null;
  }

  const { data, error } = await supabase
    .from("country_documents")
    .select(documentSelect)
    .eq("id", id)
    .eq("status", "published")
    .eq("language", "en")
    .eq("countries.is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapDocument(data as RawDocument) : null;
}
