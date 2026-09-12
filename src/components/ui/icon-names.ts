import type Ionicons from "@expo/vector-icons/Ionicons";
import type { SymbolViewProps } from "expo-symbols";

export type SFSymbolName = Extract<SymbolViewProps["name"], string>;
type IoniconName = keyof typeof Ionicons.glyphMap;

type IconDefinition = {
  sf: SFSymbolName;
  ion: IoniconName;
};

/**
 * Single icon vocabulary for the app. iOS renders SF Symbols so the app
 * feels native, every other platform falls back to Ionicons.
 */
export const iconMap = {
  home: { sf: "house", ion: "home-outline" },
  search: { sf: "magnifyingglass", ion: "search-outline" },
  bookmark: { sf: "bookmark", ion: "bookmark-outline" },
  bookmarkFill: { sf: "bookmark.fill", ion: "bookmark" },
  person: { sf: "person.crop.circle", ion: "person-circle-outline" },
  chevronLeft: { sf: "chevron.left", ion: "chevron-back" },
  chevronRight: { sf: "chevron.right", ion: "chevron-forward" },
  chevronDown: { sf: "chevron.down", ion: "chevron-down" },
  chevronUp: { sf: "chevron.up", ion: "chevron-up" },
  close: { sf: "xmark", ion: "close" },
  closeCircle: { sf: "xmark.circle.fill", ion: "close-circle" },
  arrowRight: { sf: "arrow.right", ion: "arrow-forward" },
  arrowUpRight: { sf: "arrow.up.right", ion: "open-outline" },
  check: { sf: "checkmark", ion: "checkmark" },
  checkCircle: { sf: "checkmark.circle.fill", ion: "checkmark-circle" },
  clock: { sf: "clock", ion: "time-outline" },
  trending: { sf: "chart.line.uptrend.xyaxis", ion: "trending-up-outline" },
  sparkles: { sf: "sparkles", ion: "sparkles-outline" },
  info: { sf: "info.circle", ion: "information-circle-outline" },
  warning: { sf: "exclamationmark.triangle", ion: "warning-outline" },
  alert: { sf: "exclamationmark.circle", ion: "alert-circle-outline" },
  document: { sf: "doc.text", ion: "document-text-outline" },
  documents: { sf: "doc.on.doc", ion: "documents-outline" },
  briefcase: { sf: "briefcase", ion: "briefcase-outline" },
  graduation: { sf: "graduationcap", ion: "school-outline" },
  idCard: { sf: "person.text.rectangle", ion: "id-card-outline" },
  shield: { sf: "checkmark.shield", ion: "shield-checkmark-outline" },
  car: { sf: "car", ion: "car-outline" },
  heart: { sf: "heart", ion: "heart-outline" },
  book: { sf: "book", ion: "book-outline" },
  language: { sf: "character.bubble", ion: "language-outline" },
  globe: { sf: "globe", ion: "globe-outline" },
  lock: { sf: "lock", ion: "lock-closed-outline" },
  lockShield: { sf: "lock.shield", ion: "shield-checkmark-outline" },
  mail: { sf: "envelope", ion: "mail-outline" },
  eye: { sf: "eye", ion: "eye-outline" },
  eyeOff: { sf: "eye.slash", ion: "eye-off-outline" },
  key: { sf: "key", ion: "key-outline" },
  keypad: { sf: "number", ion: "keypad-outline" },
  link: { sf: "link", ion: "link-outline" },
  trash: { sf: "trash", ion: "trash-outline" },
  signOut: {
    sf: "rectangle.portrait.and.arrow.right",
    ion: "log-out-outline",
  },
  signIn: { sf: "person.badge.key", ion: "log-in-outline" },
  edit: { sf: "pencil", ion: "create-outline" },
  help: { sf: "questionmark.circle", ion: "help-circle-outline" },
  support: { sf: "lifepreserver", ion: "chatbubbles-outline" },
  legal: { sf: "text.book.closed", ion: "document-text-outline" },
  sources: { sf: "books.vertical", ion: "library-outline" },
  settings: { sf: "gearshape", ion: "settings-outline" },
  appearance: { sf: "circle.lefthalf.filled", ion: "contrast-outline" },
  bell: { sf: "bell", ion: "notifications-outline" },
  flag: { sf: "flag", ion: "flag-outline" },
  star: { sf: "star.fill", ion: "star" },
  ellipsis: { sf: "ellipsis", ion: "ellipsis-horizontal" },
  share: { sf: "square.and.arrow.up", ion: "share-outline" },
  refresh: { sf: "arrow.clockwise", ion: "refresh-outline" },
  map: { sf: "map", ion: "map-outline" },
  building: { sf: "building.2", ion: "business-outline" },
  reportProblem: { sf: "exclamationmark.bubble", ion: "alert-circle-outline" },
  checklist: { sf: "checklist", ion: "list-outline" },
  location: { sf: "mappin.and.ellipse", ion: "location-outline" },
  euro: { sf: "eurosign.circle", ion: "cash-outline" },
  timer: { sf: "timer", ion: "timer-outline" },
  calendar: { sf: "calendar", ion: "calendar-outline" },
  sun: { sf: "sun.max", ion: "sunny-outline" },
  moon: { sf: "moon", ion: "moon-outline" },
  device: { sf: "iphone", ion: "phone-portrait-outline" },
  crown: { sf: "crown", ion: "ribbon-outline" },
  wand: { sf: "wand.and.stars", ion: "color-wand-outline" },
  plus: { sf: "plus", ion: "add" },
  layers: { sf: "square.stack.3d.up", ion: "layers-outline" },
  compass: { sf: "safari", ion: "compass-outline" },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof iconMap;

export function getSFSymbol(name: IconName): SFSymbolName {
  return iconMap[name].sf;
}
