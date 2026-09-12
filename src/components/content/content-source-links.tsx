import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Surface } from "@/components/ui/surface";
import { Radii, Spacing } from "@/constants/theme";
import {
  stringifyValue,
  type ContentSection,
} from "@/features/content/content-types";
import { useTheme } from "@/hooks/use-theme";
import { normalizeExternalUrl, openExternalUrl } from "@/lib/url";

type SourceLink = {
  label: string;
  url: string;
};

function toSourceLinks(section: ContentSection): SourceLink[] {
  const items = Array.isArray(section.items) ? section.items : [];

  return items
    .map((item) => {
      const source = item as { label?: unknown; url?: unknown };
      const url = normalizeExternalUrl(stringifyValue(source.url));

      if (!url) {
        return null;
      }

      return { label: stringifyValue(source.label) || url, url };
    })
    .filter((link): link is SourceLink => Boolean(link));
}

export function ContentSourceLinks({ section }: { section: ContentSection }) {
  const { colors } = useTheme();
  const links = toSourceLinks(section);

  if (links.length === 0) {
    return null;
  }

  return (
    <Surface>
      <AppText variant="title3">{section.title || "Official sources"}</AppText>
      <View style={styles.list}>
        {links.map((link, index) => (
          <PressableScale
            key={`${link.url}-${index}`}
            onPress={() => openExternalUrl(link.url, link.label)}
            scaleTo={0.985}
            accessibilityRole="link"
            accessibilityLabel={`Open ${link.label}`}
            accessibilityHint="Opens the website in your browser"
            style={[styles.link, { backgroundColor: colors.surfaceLow }]}
          >
            <IconBadge icon="link" tone="primary" size={36} iconSize={16} radius="sm" />
            <View style={styles.linkText}>
              <AppText variant="callout" numberOfLines={2}>
                {link.label}
              </AppText>
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {link.url}
              </AppText>
            </View>
            <Icon name="arrowUpRight" size={16} color={colors.textTertiary} />
          </PressableScale>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
});
