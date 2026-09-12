import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { dataDeletion } from "@/constants/dataDeletion";
import { openSource } from "@/constants/openSource";
import { privacyPolicy } from "@/constants/privacyPolicy";
import { termsAndCondition } from "@/constants/terms&condition";
import { Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const policies = {
  "privacy-policy": privacyPolicy,
  "terms-and-conditions": termsAndCondition,
  "data-deletion": dataDeletion,
  "open-source": openSource,
} as const;

const policyHeaderTitles: Record<PolicyKey, string> = {
  "privacy-policy": "Privacy policy",
  "terms-and-conditions": "Terms and conditions",
  "data-deletion": "Data deletion",
  "open-source": "Open source",
};

type PolicyKey = keyof typeof policies;
type PolicyBlock = (typeof policies)[PolicyKey]["blocks"][number];

function isPolicyKey(value: string): value is PolicyKey {
  return value in policies;
}

export default function PolicyDetailScreen() {
  const params = useLocalSearchParams<{ policy?: string }>();
  const policyKey =
    params.policy && isPolicyKey(params.policy) ? params.policy : "privacy-policy";
  const policy = policies[policyKey];

  return (
    <Screen scroll header={<ScreenHeader padded title={policyHeaderTitles[policyKey]} />}>
      <Entrance from="none">
        <Surface>
          <AppText variant="title2">{policy.title}</AppText>
          <AppText variant="caption" color="textTertiary" style={styles.updated}>
            Last updated {policy.lastUpdated}
          </AppText>
          <View style={styles.blocks}>
            {policy.blocks.map((block, index) => (
              <PolicyBlockRenderer key={`${block.type}-${index}`} block={block} />
            ))}
          </View>
        </Surface>
      </Entrance>
    </Screen>
  );
}

function PolicyBlockRenderer({ block }: { block: PolicyBlock }) {
  const { colors } = useTheme();

  switch (block.type) {
    case "heading":
      return (
        <AppText variant="title3" style={styles.heading}>
          {block.text}
        </AppText>
      );
    case "subheading":
      return (
        <AppText variant="headline" style={styles.subheading}>
          {block.text}
        </AppText>
      );
    case "paragraph":
      return (
        <AppText variant="body" color="textSecondary" style={styles.paragraph}>
          {block.text}
        </AppText>
      );
    case "bullets":
      return (
        <View style={styles.bullets}>
          {block.items.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <AppText variant="body" color="textSecondary" style={styles.bulletText}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View style={[styles.table, { backgroundColor: colors.surfaceLow }]}>
          <View style={[styles.tableRow, { backgroundColor: colors.surfaceHigh }]}>
            {block.headers.map((header) => (
              <AppText key={header} variant="eyebrow" color="primary" style={styles.tableCell}>
                {header}
              </AppText>
            ))}
          </View>
          {block.rows.map((row, rowIndex) => (
            <View
              key={`${row[0]}-${rowIndex}`}
              style={[
                styles.tableRow,
                rowIndex % 2 === 0 ? { backgroundColor: colors.surfaceLowest } : null,
              ]}
            >
              {row.map((cell, cellIndex) => (
                <AppText
                  key={`${row[0]}-${cellIndex}`}
                  variant="caption"
                  color={cellIndex === 0 ? "text" : "textSecondary"}
                  style={styles.tableCell}
                >
                  {cell}
                </AppText>
              ))}
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  updated: {
    marginTop: Spacing.sm,
  },
  blocks: {
    marginTop: Spacing.lg,
  },
  heading: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  subheading: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    marginBottom: Spacing.md,
  },
  bullets: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
  },
  bulletText: {
    flex: 1,
    minWidth: 0,
  },
  table: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    borderRadius: Radii.md,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  tableCell: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
});
