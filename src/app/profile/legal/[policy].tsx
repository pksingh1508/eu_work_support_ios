import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ContentList } from "@/components/content/content-sections";
import { ContentTable } from "@/components/content/content-table";
import { Screen } from "@/components/ui/screen";
import { dataDeletion } from "@/constants/dataDeletion";
import { openSource } from "@/constants/openSource";
import { privacyPolicy } from "@/constants/privacyPolicy";
import { termsAndCondition } from "@/constants/terms&condition";
import { Layout, Spacing } from "@/constants/theme";

const policies = {
  "privacy-policy": privacyPolicy,
  "terms-and-conditions": termsAndCondition,
  "data-deletion": dataDeletion,
  "open-source": openSource,
} as const;

const policyHeaderTitles: Record<PolicyKey, string> = {
  "privacy-policy": "Privacy Policy",
  "terms-and-conditions": "Terms",
  "data-deletion": "Data Deletion",
  "open-source": "Open Source",
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
    <Screen nativeHeader scroll contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{ title: policyHeaderTitles[policyKey], scrollEdgeEffects: { top: "hard" } }}
      />
      <AppText variant="title1" accessibilityRole="header" selectable>
        {policy.title}
      </AppText>
      <AppText variant="footnote" color="textSecondary" style={styles.updated}>
        Last updated {policy.lastUpdated}
      </AppText>
      <View style={styles.blocks}>
        {policy.blocks.map((block, index) => (
          <PolicyBlockRenderer key={`${block.type}-${index}`} block={block} />
        ))}
      </View>
    </Screen>
  );
}

/** Same reading rules as guides: ink text on the page, real headings, selectable. */
function PolicyBlockRenderer({ block }: { block: PolicyBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <AppText variant="title3" accessibilityRole="header" selectable style={styles.heading}>
          {block.text}
        </AppText>
      );
    case "subheading":
      return (
        <AppText variant="headline" accessibilityRole="header" selectable style={styles.subheading}>
          {block.text}
        </AppText>
      );
    case "paragraph":
      return (
        <AppText variant="reading" selectable style={styles.paragraph}>
          {block.text}
        </AppText>
      );
    case "bullets":
      return <ContentList items={[...block.items]} marker="bullet" style={styles.paragraph} />;
    case "table":
      return (
        <View style={styles.table}>
          <ContentTable
            section={{
              type: "table",
              columns: [...block.headers],
              rows: block.rows.map((row) => [...row]),
            }}
          />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  content: {
    maxWidth: Layout.proseMaxWidth + Layout.screenPadding * 2,
    paddingTop: Spacing.sm,
  },
  updated: {
    marginTop: Spacing.sm,
  },
  blocks: {
    marginTop: Spacing.lg,
  },
  heading: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  subheading: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    marginBottom: Spacing.lg,
  },
  table: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
});
