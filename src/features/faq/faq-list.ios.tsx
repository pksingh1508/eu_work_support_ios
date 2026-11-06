import { DisclosureGroup, Form, Host, Section, Text } from "@expo/ui/swift-ui";
import {
  foregroundStyle,
  padding,
  scrollContentBackground,
  textSelection,
} from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { FaqListProps } from "@/features/faq/faq-list.types";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";

/**
 * Native expandable questions (SwiftUI DisclosureGroup in an inset-grouped
 * Form). Answers use the system body style, so they follow Dynamic Type, and
 * can be selected and copied.
 */
export function FaqList({ items, footer }: FaqListProps) {
  const { scheme, colors } = useTheme();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Host style={styles.flex} colorScheme={scheme}>
        <Form modifiers={[scrollContentBackground("hidden")]}>
          <Section footer={footer ? <Text>{footer}</Text> : undefined}>
            {items.map((item) => (
              <DisclosureGroup
                key={item.id}
                label={item.question}
                isExpanded={openId === item.id}
                onIsExpandedChange={(expanded) => {
                  haptic.selection();
                  setOpenId(expanded ? item.id : null);
                }}
              >
                <Text
                  modifiers={[
                    foregroundStyle(colors.text),
                    textSelection(true),
                    padding({ vertical: 6 }),
                  ]}
                >
                  {item.answer}
                </Text>
              </DisclosureGroup>
            ))}
          </Section>
        </Form>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
