import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Accordion } from "@/components/ui/accordion";
import { AppText } from "@/components/ui/app-text";
import { Layout, ReadableColumn, Spacing } from "@/constants/theme";
import type { FaqListProps } from "@/features/faq/faq-list.types";

/** Expandable questions. iOS renders SwiftUI DisclosureGroups (faq-list.ios.tsx). */
export function FaqList({ items, footer }: FaqListProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[ReadableColumn, styles.content]}
    >
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Accordion
            title={item.question}
            icon="help"
            isOpen={openId === item.id}
            onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
          >
            <AppText variant="reading" selectable>
              {item.answer}
            </AppText>
          </Accordion>
        </View>
      ))}
      {footer ? (
        <AppText variant="footnote" color="textSecondary" style={styles.item}>
          {footer}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.bottomPadding,
  },
  item: {
    marginTop: Spacing.sm,
  },
});
