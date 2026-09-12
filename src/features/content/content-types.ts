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
