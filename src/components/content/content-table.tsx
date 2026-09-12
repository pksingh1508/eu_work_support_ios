import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Surface } from "@/components/ui/surface";
import { Radii, Spacing } from "@/constants/theme";
import {
  stringifyValue,
  type ContentSection,
} from "@/features/content/content-types";
import { useTheme } from "@/hooks/use-theme";

const NARROW_COLUMN_WIDTH = 170;
const WIDE_COLUMN_WIDTH = 220;

export function ContentTable({ section }: { section: ContentSection }) {
  const { colors } = useTheme();
  const columns = Array.isArray(section.columns) ? section.columns : [];
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const columnCount = Math.max(
    columns.length,
    ...rows.map((row) => (Array.isArray(row) ? row.length : 0)),
    1,
  );
  const columnWidth = columnCount <= 2 ? WIDE_COLUMN_WIDTH : NARROW_COLUMN_WIDTH;

  return (
    <Surface>
      {section.title ? (
        <AppText variant="title3" style={styles.title}>
          {section.title}
        </AppText>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.table, { backgroundColor: colors.surfaceLow }]}>
          {columns.length > 0 ? (
            <View style={[styles.headerRow, { backgroundColor: colors.surfaceHigh }]}>
              {columns.map((column, index) => (
                <View key={`${column}-${index}`} style={[styles.cell, { width: columnWidth }]}>
                  <AppText variant="eyebrow" color="primary">
                    {column}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          {rows.map((row, rowIndex) => (
            <View
              key={`${section.title ?? "table"}-${rowIndex}`}
              style={[
                styles.row,
                rowIndex % 2 === 0 ? { backgroundColor: colors.surfaceLowest } : null,
              ]}
            >
              {(Array.isArray(row) ? row : []).map((cell, cellIndex) => (
                <View key={`${rowIndex}-${cellIndex}`} style={[styles.cell, { width: columnWidth }]}>
                  <AppText
                    variant={cellIndex === 0 ? "callout" : "subhead"}
                    color={cellIndex === 0 ? "text" : "textSecondary"}
                  >
                    {stringifyValue(cell)}
                  </AppText>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  table: {
    borderRadius: Radii.md,
    overflow: "hidden",
    minWidth: "100%",
  },
  headerRow: {
    flexDirection: "row",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
