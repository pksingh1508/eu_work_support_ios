import { useState } from "react";
import { StyleSheet } from "react-native";

import { Accordion } from "@/components/ui/accordion";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Spacing } from "@/constants/theme";
import { FAQs } from "@/constants/FAQ";

export default function FAQScreen() {
  const [openId, setOpenId] = useState<string | null>(FAQs[0]?.id ?? null);

  return (
    <Screen scroll header={<ScreenHeader padded title="FAQ" />}>
      <Entrance from="none">
        <AppText variant="title2">Common questions</AppText>
        <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
          Quick answers for using EU Work Support and managing your guides.
        </AppText>
      </Entrance>

      {FAQs.map((item, index) => (
        <Entrance key={item.id} index={index + 1} style={styles.item}>
          <Accordion
            title={item.question}
            icon="help"
            isOpen={openId === item.id}
            onToggle={() =>
              setOpenId((currentId) => (currentId === item.id ? null : item.id))
            }
          >
            <AppText variant="body" color="textSecondary">
              {item.answer}
            </AppText>
          </Accordion>
        </Entrance>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  item: {
    marginTop: Spacing.sm,
  },
});
