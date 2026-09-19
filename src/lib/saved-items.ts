import { fetchGuestContent } from "@/features/billing/guest-premium";
import type { ContentSource } from "@/features/content/content-types";
import { supabase } from "@/lib/supabase";

const savedCountrySelect = `
  id,
  created_at,
  countries!inner (
    id,
    slug,
    name,
    flag_emoji,
    short_description
  )
`;

const savedDocumentSelect = `
  id,
  created_at,
  notes,
  country_documents!inner (
    id,
    title,
    slug,
    short_description,
    intro,
    countries!inner (
      id,
      slug,
      name,
      flag_emoji
    ),
    document_categories!inner (
      id,
      slug,
      name,
      icon
    )
  )
`;

type RelatedCountry = {
  id: string;
  slug: string;
  name: string;
  flag_emoji: string | null;
  short_description?: string | null;
};

type RelatedCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type RelatedDocument = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  intro: string | null;
  countries: RelatedCountry | RelatedCountry[] | null;
  document_categories: RelatedCategory | RelatedCategory[] | null;
};

type RawSavedCountry = {
  id: string;
  created_at: string;
  countries: RelatedCountry | RelatedCountry[] | null;
};

type RawSavedDocument = {
  id: string;
  created_at: string;
  notes: string | null;
  country_documents: RelatedDocument | RelatedDocument[] | null;
};

export type SavedCountry = {
  id: string;
  countryId: string;
  slug: string;
  name: string;
  flagEmoji: string | null;
  shortDescription: string | null;
  createdAt: string;
};

export type SavedDocument = {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  intro: string | null;
  countryName: string;
  countrySlug: string;
  countryFlagEmoji: string | null;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string | null;
  createdAt: string;
};

export type SavedItems = {
  countries: SavedCountry[];
  documents: SavedDocument[];
};

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

async function ensureUserProfile() {
  const { error } = await supabase.rpc("ensure_user_profile");

  if (error) {
    throw error;
  }
}

export async function fetchCountryIdBySlug(slug: string, source: ContentSource) {
  if (source === "guest") {
    return fetchGuestContent<string | null>({ action: "countryId", slug });
  }

  const { data, error } = await supabase
    .from("countries")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function fetchSavedCountrySlugs(clerkUserId: string) {
  const { data, error } = await supabase
    .from("saved_countries")
    .select("countries!inner(slug)")
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => firstRelation((row as RawSavedCountry).countries)?.slug)
    .filter((slug): slug is string => Boolean(slug));
}

export async function isCountrySaved(
  clerkUserId: string,
  countryId: string,
) {
  const { data, error } = await supabase
    .from("saved_countries")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .eq("country_id", countryId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function setCountrySaved({
  clerkUserId,
  countryId,
  shouldSave,
}: {
  clerkUserId: string;
  countryId: string;
  shouldSave: boolean;
}) {
  if (shouldSave) {
    await ensureUserProfile();

    const { error } = await supabase.from("saved_countries").upsert(
      {
        clerk_user_id: clerkUserId,
        country_id: countryId,
      },
      {
        onConflict: "clerk_user_id,country_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from("saved_countries")
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("country_id", countryId);

  if (error) {
    throw error;
  }
}

export async function isDocumentSaved(
  clerkUserId: string,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("saved_documents")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .eq("document_id", documentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function setDocumentSaved({
  clerkUserId,
  documentId,
  shouldSave,
}: {
  clerkUserId: string;
  documentId: string;
  shouldSave: boolean;
}) {
  if (shouldSave) {
    await ensureUserProfile();

    const { error } = await supabase.from("saved_documents").upsert(
      {
        clerk_user_id: clerkUserId,
        document_id: documentId,
      },
      {
        onConflict: "clerk_user_id,document_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase
    .from("saved_documents")
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("document_id", documentId);

  if (error) {
    throw error;
  }
}

export async function fetchSavedItems(
  clerkUserId: string,
): Promise<SavedItems> {
  const [countriesResponse, documentsResponse] = await Promise.all([
    supabase
      .from("saved_countries")
      .select(savedCountrySelect)
      .eq("clerk_user_id", clerkUserId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_documents")
      .select(savedDocumentSelect)
      .eq("clerk_user_id", clerkUserId)
      .order("created_at", { ascending: false }),
  ]);

  if (countriesResponse.error) {
    throw countriesResponse.error;
  }

  if (documentsResponse.error) {
    throw documentsResponse.error;
  }

  return {
    countries: ((countriesResponse.data ?? []) as RawSavedCountry[])
      .map((row) => {
        const country = firstRelation(row.countries);

        if (!country) {
          return null;
        }

        return {
          id: row.id,
          countryId: country.id,
          slug: country.slug,
          name: country.name,
          flagEmoji: country.flag_emoji,
          shortDescription: country.short_description ?? null,
          createdAt: row.created_at,
        };
      })
      .filter((country): country is SavedCountry => Boolean(country)),
    documents: ((documentsResponse.data ?? []) as RawSavedDocument[])
      .map((row) => {
        const document = firstRelation(row.country_documents);
        const country = document ? firstRelation(document.countries) : null;
        const category = document
          ? firstRelation(document.document_categories)
          : null;

        if (!document || !country || !category) {
          return null;
        }

        return {
          id: row.id,
          documentId: document.id,
          title: document.title,
          slug: document.slug,
          shortDescription: document.short_description,
          intro: document.intro,
          countryName: country.name,
          countrySlug: country.slug,
          countryFlagEmoji: country.flag_emoji,
          categoryName: category.name,
          categorySlug: category.slug,
          categoryIcon: category.icon,
          createdAt: row.created_at,
        };
      })
      .filter((document): document is SavedDocument => Boolean(document)),
  };
}
