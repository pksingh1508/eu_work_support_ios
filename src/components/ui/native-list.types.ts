import type { IconName } from "@/components/ui/icon-names";

export type NativeListRow = {
  key: string;
  title: string;
  icon?: IconName;
  /** Icon colour; defaults to the app's primary colour. */
  iconColor?: string;
  /** Secondary text on the trailing side (status, count, version). */
  value?: string;
  onPress?: () => void;
  /** Red title and icon, for sign out / delete. */
  destructive?: boolean;
  /** Shows the disclosure chevron. Defaults to true for tappable rows. */
  chevron?: boolean;
  /** Opens outside the app (in-app Safari, Mail): arrow instead of chevron. */
  external?: boolean;
};

export type NativeListSection = {
  key: string;
  title?: string;
  footer?: string;
  rows: NativeListRow[];
};

/** Person row at the top of the list, like the Apple Account row in Settings. */
export type NativeListIdentity = {
  name: string;
  detail?: string;
  badge?: { label: string; icon: IconName; color: string };
  onPress?: () => void;
};

export type NativeListProps = {
  sections: NativeListSection[];
  identity?: NativeListIdentity;
  /** Text under the last section (version line). */
  footnote?: string;
};
