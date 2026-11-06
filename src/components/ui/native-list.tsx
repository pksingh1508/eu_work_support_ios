import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import type { NativeListProps } from "@/components/ui/native-list.types";
import { Layout, ReadableColumn, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Grouped list. iOS renders a SwiftUI Form (see `native-list.ios.tsx`); other
 * platforms use the app's own rows.
 */
export function NativeList({ sections, identity, footnote }: NativeListProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[ReadableColumn, styles.content]}
    >
      {identity ? (
        <View style={styles.section}>
          <ListGroup>
            <ListRow
              icon="person"
              title={identity.name}
              subtitle={identity.detail}
              value={identity.badge?.label}
              onPress={identity.onPress}
              trailing={identity.onPress ? "chevron" : "none"}
            />
          </ListGroup>
        </View>
      ) : null}
      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <ListGroup title={section.title}>
            {section.rows.map((row) => (
              <ListRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                value={row.value}
                tone={row.destructive ? "danger" : "default"}
                trailing={row.chevron === false || !row.onPress ? "none" : "chevron"}
                onPress={row.onPress}
              />
            ))}
          </ListGroup>
          {section.footer ? (
            <AppText variant="footnote" color="textSecondary" style={styles.footer}>
              {section.footer}
            </AppText>
          ) : null}
        </View>
      ))}
      {footnote ? (
        <AppText variant="footnote" color="textSecondary" align="center" style={styles.section}>
          {footnote}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.bottomPadding,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  footer: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
});
