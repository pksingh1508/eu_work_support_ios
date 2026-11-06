import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { ContentFaq } from "@/components/content/content-faq";
import { ContentSourceLinks } from "@/components/content/content-source-links";
import { ContentTable } from "@/components/content/content-table";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Surface, type SurfaceTone } from "@/components/ui/surface";
import { Radii, Spacing } from "@/constants/theme";
import {
  stringifyValue,
  type ContentSection,
} from "@/features/content/content-types";
import { useTheme } from "@/hooks/use-theme";

type ContentSectionsProps = {
  sections: ContentSection[];
  /** Reports where each section starts, so a table of contents can jump to it. */
  onSectionLayout?: (index: number, y: number) => void;
};

/**
 * Renders the `content_json.sections` array of a guide as a reading layout.
 *
 * Readability rules (see constants/theme.ts):
 * - Running text flows on the page instead of sitting in cards, so lines get
 *   the full column width (~50-70 characters on a phone column).
 * - Body text uses the primary ink colour; grey is kept for metadata.
 * - Only callouts and warnings get a tinted box, so the box itself means
 *   "pay attention".
 * - Headings are real accessibility headers (VoiceOver rotor can jump
 *   between them) and get more space above than below, so they group with
 *   the text they introduce.
 * - All text is selectable, so fees, addresses and form names can be copied.
 *
 * Sections render without entrance animations: text that moves while it is
 * being read is harder to follow.
 */
export function ContentSections({ sections, onSectionLayout }: ContentSectionsProps) {
  return (
    <View>
      {sections.map((section, index) => (
        <View
          key={`${section.type ?? "section"}-${index}`}
          style={index === 0 ? null : spacingFor(section)}
          onLayout={
            onSectionLayout
              ? (event: LayoutChangeEvent) => onSectionLayout(index, event.nativeEvent.layout.y)
              : undefined
          }
        >
          <ContentSectionView section={section} />
        </View>
      ))}
    </View>
  );
}

function spacingFor(section: ContentSection) {
  return isBoxed(section.type) ? styles.boxedGap : styles.sectionGap;
}

function isBoxed(type: string | undefined) {
  return type === "warning" || type === "callout" || type === "quick_answer";
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
      return isBoxed(section.type) ? (
        <CalloutSection section={section} />
      ) : (
        <TextSection section={section} />
      );
  }
}

function sectionItems(section: ContentSection) {
  return (Array.isArray(section.items) ? section.items : [])
    .map((item) => stringifyValue(item))
    .filter((text) => text.length > 0);
}

function markerFor(type: string | undefined): ListMarker {
  if (type === "numbered_steps") return "number";
  if (type === "checklist") return "check";
  return "bullet";
}

/** Plain prose: heading, paragraphs and lists flowing on the page. */
function TextSection({ section }: { section: ContentSection }) {
  const items = sectionItems(section);

  return (
    <View>
      {section.title ? (
        <AppText
          variant={section.type === "hero" ? "title2" : "title3"}
          accessibilityRole="header"
          selectable
          style={styles.heading}
        >
          {section.title}
        </AppText>
      ) : null}
      {section.content ? <Paragraphs text={section.content} /> : null}
      {items.length > 0 ? (
        <ContentList
          items={items}
          marker={markerFor(section.type)}
          style={section.content ? styles.listAfterText : null}
        />
      ) : null}
    </View>
  );
}

/** Quick answers, callouts and warnings: the only boxed sections. */
function CalloutSection({ section }: { section: ContentSection }) {
  const { colors } = useTheme();
  const isWarning = section.type === "warning";
  const tone: SurfaceTone = isWarning ? "tertiary" : "primary";
  const accent = isWarning ? colors.tertiary : colors.primary;
  const items = sectionItems(section);

  return (
    <Surface
      tone={tone}
      radius="lg"
      accessibilityRole={isWarning ? "alert" : undefined}
      style={[styles.callout, { borderLeftColor: accent }]}
    >
      <View style={styles.calloutTitleRow}>
        <Icon name={isWarning ? "warning" : "sparkles"} size={18} color={accent} />
        <AppText variant="headline" accessibilityRole="header" selectable style={styles.flex}>
          {section.title || (isWarning ? "Important" : "Quick answer")}
        </AppText>
      </View>
      {section.content ? <Paragraphs text={section.content} /> : null}
      {items.length > 0 ? (
        <ContentList
          items={items}
          marker={markerFor(section.type)}
          style={section.content ? styles.listAfterText : null}
        />
      ) : null}
    </Surface>
  );
}

/** Splits on blank lines so long answers keep their paragraph breaks. */
function Paragraphs({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <View style={styles.paragraphs}>
      {paragraphs.map((paragraph, index) => (
        <AppText key={index} variant="reading" selectable>
          {paragraph}
        </AppText>
      ))}
    </View>
  );
}

type ListMarker = "number" | "check" | "bullet";

export function ContentList({
  items,
  marker,
  style,
}: {
  items: string[];
  marker: ListMarker;
  style?: object | null;
}) {
  return (
    <View style={[styles.items, style]}>
      {items.map((text, index) => (
        <ContentListItem
          key={`${index}-${text.slice(0, 24)}`}
          index={index}
          text={text}
          marker={marker}
        />
      ))}
    </View>
  );
}

function ContentListItem({
  index,
  text,
  marker,
}: {
  index: number;
  text: string;
  marker: ListMarker;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.item}>
      <View style={styles.markerSlot} importantForAccessibility="no-hide-descendants">
        {marker === "number" ? (
          <View style={[styles.numberBadge, { backgroundColor: colors.primarySoft }]}>
            <AppText variant="label" color="primary" maxFontSizeMultiplier={1.4}>
              {index + 1}
            </AppText>
          </View>
        ) : marker === "check" ? (
          <Icon name="checkCircle" size={20} color={colors.success} />
        ) : (
          <View style={[styles.bullet, { backgroundColor: colors.text }]} />
        )}
      </View>
      <AppText
        variant="reading"
        selectable
        style={styles.flex}
        accessibilityLabel={marker === "number" ? `Step ${index + 1}. ${text}` : undefined}
      >
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  sectionGap: {
    marginTop: Spacing.xxxl,
  },
  boxedGap: {
    marginTop: Spacing.xxl,
  },
  heading: {
    marginBottom: Spacing.sm,
  },
  paragraphs: {
    gap: Spacing.md,
  },
  callout: {
    borderLeftWidth: 4,
    gap: Spacing.sm,
    borderRadius: Radii.lg,
  },
  calloutTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  listAfterText: {
    marginTop: Spacing.md,
  },
  items: {
    gap: Spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  // Same height as one line of reading text, so markers sit on the first line.
  markerSlot: {
    width: 24,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
