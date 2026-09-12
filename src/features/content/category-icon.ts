import type { IconName } from "@/components/ui/icon-names";

/**
 * Maps the `document_categories.icon` value stored in Supabase to the app
 * icon vocabulary.
 */
export function getCategoryIcon(icon: string | null | undefined): IconName {
  switch (icon) {
    case "briefcase":
    case "building-2":
      return "briefcase";
    case "graduation-cap":
      return "graduation";
    case "passport":
    case "id-card":
      return "idCard";
    case "file-text":
      return "document";
    case "shield-check":
      return "shield";
    case "car":
      return "car";
    case "heart-pulse":
      return "heart";
    case "book-open":
      return "book";
    case "languages":
      return "language";
    default:
      return "document";
  }
}
