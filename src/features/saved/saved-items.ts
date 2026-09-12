import type { SavedCountry, SavedDocument } from "@/lib/saved-items";

export type SavedItem =
  | ({ type: "country" } & SavedCountry)
  | ({ type: "document" } & SavedDocument);

export type SavedFilter = "all" | "countries" | "documents";

export function savedItemKey(item: SavedItem) {
  return `${item.type}-${item.type === "country" ? item.countryId : item.documentId}`;
}

export function mergeSavedItems(
  countries: SavedCountry[],
  documents: SavedDocument[],
): SavedItem[] {
  return [
    ...countries.map((country) => ({ ...country, type: "country" as const })),
    ...documents.map((document) => ({ ...document, type: "document" as const })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function filterSavedItems(items: SavedItem[], filter: SavedFilter) {
  switch (filter) {
    case "countries":
      return items.filter((item) => item.type === "country");
    case "documents":
      return items.filter((item) => item.type === "document");
    default:
      return items;
  }
}
