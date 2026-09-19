export type ContentSection = {
  type?: string;
  title?: string;
  content?: string;
  items?: unknown[];
  columns?: string[];
  rows?: unknown[][];
};

export type ContentJson = {
  sections?: ContentSection[];
};

/**
 * Where Premium content is read from. Members (signed in with Clerk) query
 * Supabase directly and RLS checks their plan. Guests have no session, so
 * their reads go through the `guest-premium` Edge Function, which checks the
 * device's App Store purchase instead (see `features/billing/guest-premium.ts`).
 */
export type ContentSource = "member" | "guest";

export function normalizeContentJson(value: unknown): ContentJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { sections: [] };
  }

  const maybeContent = value as ContentJson;
  return Array.isArray(maybeContent.sections) ? maybeContent : { sections: [] };
}

export function stringifyValue(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

export function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
