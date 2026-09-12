import { StyleSheet, View } from "react-native";

import { ContentFaq } from "@/components/content/content-faq";
import { ContentSourceLinks } from "@/components/content/content-source-links";
import { ContentTable } from "@/components/content/content-table";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface, type SurfaceTone } from "@/components/ui/surface";
import { Radii, Spacing } from "@/constants/theme";
import {
  stringifyValue,
  type ContentSection,
} from "@/features/content/content-types";
import { useTheme } from "@/hooks/use-theme";

type ContentSectionsProps = {
  sections: ContentSection[];
  animated?: boolean;
};

/**
 * Renders the `content_json.sections` array of a guide document.
 */
export function ContentSections({ sections, animated = true }: ContentSectionsProps) {
  return (
    <View style={styles.list}>
      {sections.map((section, index) => {
        const key = `${section.type ?? "section"}-${index}`;
        const node = <ContentSectionView section={section} />;

        return animated ? (
          <Entrance key={key} index={index}>
            {node}
          </Entrance>
        ) : (
          <View key={key}>{node}</View>
        );
      })}
    </View>
  );
}

export function ContentSectionView({ section }: { section: ContentSection }) {
  switch (section.type) {
    case "table":
      return <ContentTable section={section} />;
    case "faq":
      return <ContentFaq section={section} />;
    case "source_links":
      return <ContentSourceLinks section={section} />;
    default:
      return <TextSection section={section} />;
  }
}

function TextSection({ section }: { section: ContentSection }) {
  const type = section.type;
  const isWarning = type === "warning";
  const isCallout = type === "callout" || type === "quick_answer";
  const isHero = type === "hero";
  const isNumbered = type === "numbered_steps";
  const isChecklist = type === "checklist";
  const items = Array.isArray(section.items) ? section.items : [];
  const tone: SurfaceTone = isWarning ? "tertiary" : isCallout ? "primary" : "default";
  const accentIcon = isWarning ? "warning" : isCallout ? "sparkles" : null;

  return (
    <Surface tone={tone}>
      {section.title || accentIcon ? (
        <View style={styles.titleRow}>
          {accentIcon ? (
            <IconBadge
              icon={accentIcon}
              tone={isWarning ? "tertiary" : "primary"}
              size={32}
              iconSize={16}
              radius="sm"
            />
          ) : null}
          {section.title ? (
            <AppText variant={isHero ? "title2" : "title3"} style={styles.title}>
              {section.title}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {section.content ? (
        <AppText
          variant="body"
          color="textSecondary"
          style={section.title ? styles.content : null}
        >
          {section.content}
        </AppText>
      ) : null}

      {items.length > 0 ? (
        <View style={[styles.items, section.title || section.content ? styles.itemsSpaced : null]}>
          {items.map((item, index) => (
            <ContentListItem
              key={`${index}-${stringifyValue(item).slice(0, 24)}`}
              index={index}
              text={stringifyValue(item)}
              marker={isNumbered ? "number" : isChecklist ? "check" : "bullet"}
            />
          ))}
        </View>
      ) : null}
    </Surface>
  );
}

function ContentListItem({
  index,
  text,
  marker,
}: {
  index: number;
  text: string;
  marker: "number" | "check" | "bullet";
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.item}>
      {marker === "number" ? (
        <View style={[styles.numberBadge, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="label" color="primary">
            {index + 1}
          </AppText>
        </View>
      ) : marker === "check" ? (
        <View style={styles.checkWrap}>
          <Icon name="checkCircle" size={20} color={colors.success} />
        </View>
      ) : (
        <View style={styles.bulletWrap}>
          <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
        </View>
      )}
      <AppText variant="body" color="textSecondary" style={styles.itemText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    marginTop: Spacing.md,
  },
  items: {
    gap: Spacing.md,
  },
  itemsSpaced: {
    marginTop: Spacing.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  numberBadge: {
    width: 26,
    height: 26,
    borderRadius: Radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkWrap: {
    height: 24,
    justifyContent: "center",
  },
  bulletWrap: {
    width: 26,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
