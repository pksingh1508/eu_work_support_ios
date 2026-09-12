import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Accordion } from "@/components/ui/accordion";
import { AppText } from "@/components/ui/app-text";
import { Spacing } from "@/constants/theme";
import {
  stringifyValue,
  type ContentSection,
} from "@/features/content/content-types";

type FaqItem = {
  question: string;
  answer: string;
};

function toFaqItems(section: ContentSection): FaqItem[] {
  const items = Array.isArray(section.items) ? section.items : [];

  return items
    .map((item) => {
      const faq = item as { question?: unknown; answer?: unknown };

      return {
        question: stringifyValue(faq.question),
        answer: stringifyValue(faq.answer),
      };
    })
    .filter((item) => item.question.length > 0);
}

export function ContentFaq({ section }: { section: ContentSection }) {
  const items = toFaqItems(section);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      <AppText variant="title3" style={styles.title}>
        {section.title || "Frequently asked questions"}
      </AppText>
      <View style={styles.list}>
        {items.map((item, index) => (
          <Accordion
            key={`${item.question}-${index}`}
            title={item.question}
            icon="help"
            isOpen={openIndex === index}
            onToggle={() =>
              setOpenIndex((current) => (current === index ? null : index))
            }
          >
            <AppText variant="body" color="textSecondary">
              {item.answer}
            </AppText>
          </Accordion>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  list: {
    gap: Spacing.sm,
  },
});
