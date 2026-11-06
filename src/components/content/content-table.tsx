import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Radii, Spacing } from "@/constants/theme";
import {
  stringifyValue,
  type ContentSection,
} from "@/features/content/content-types";
import { useTheme } from "@/hooks/use-theme";

/**
 * Below this width a grid can't give every column a readable line, so rows
 * are stacked instead. ~2 columns of 30+ characters need about 520pt.
 */
const GRID_MIN_WIDTH = 520;

/**
 * Guide tables (documents, fees, timelines, mistakes).
 *
 * Narrow tables are stacked on phones (the pattern responsive-table research
 * recommends for few-column data): each row becomes a block with the first
 * cell as its title and the other cells labelled by their column name. On
 * wide windows (iPhone Duo open, iPad) the real grid is shown and cells wrap.
 * Nothing scrolls sideways and no text is ever cut off.
 */
export function ContentTable({ section }: { section: ContentSection }) {
  const [width, setWidth] = useState(0);
  const columns = (Array.isArray(section.columns) ? section.columns : []).map((column) =>
    stringifyValue(column),
  );
  const rows = (Array.isArray(section.rows) ? section.rows : [])
    .filter(Array.isArray)
    .map((row) => row.map((cell) => stringifyValue(cell)));

  if (rows.length === 0) {
    return null;
  }

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  };

  return (
    <View onLayout={onLayout}>
      {section.title ? (
        <AppText variant="title3" accessibilityRole="header" selectable style={styles.title}>
          {section.title}
        </AppText>
      ) : null}
      {width === 0 ? null : width >= GRID_MIN_WIDTH ? (
        <GridTable columns={columns} rows={rows} />
      ) : (
        <StackedTable columns={columns} rows={rows} />
      )}
    </View>
  );
}

type TableProps = {
  columns: string[];
  rows: string[][];
};

function StackedTable({ columns, rows }: TableProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceLowest }]}>
      {rows.map((row, rowIndex) => {
        const [first = "", ...rest] = row;
        const restLabelled = rest.map((value, index) => ({
          label: columns[index + 1] ?? "",
          value,
        }));
        const isPair = row.length <= 2;

        return (
          <View
            key={rowIndex}
            accessible
            style={[
              styles.stackedRow,
              rowIndex > 0
                ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineStrong }
                : null,
            ]}
          >
            <AppText variant="headline" selectable>
              {first}
            </AppText>
            {restLabelled.map(({ label, value }, index) =>
              value ? (
                <View key={index} style={isPair ? styles.pairValue : styles.labelledValue}>
                  {/* A two-column table reads as "term: explanation", so the
                      column name would only repeat itself on every row. */}
                  {!isPair && label ? (
                    <AppText variant="footnote" color="textSecondary" selectable>
                      {label}
                    </AppText>
                  ) : null}
                  <AppText variant="body" selectable>
                    {value}
                  </AppText>
                </View>
              ) : null,
            )}
          </View>
        );
      })}
    </View>
  );
}

function GridTable({ columns, rows }: TableProps) {
  const { colors } = useTheme();
  const columnCount = Math.max(columns.length, ...rows.map((row) => row.length), 1);
  const indexes = Array.from({ length: columnCount }, (_, index) => index);
  // The first column names the row and is usually short; give the rest more room.
  const flexFor = (index: number) => (index === 0 ? 1 : 1.4);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceLowest }]}>
      {columns.length > 0 ? (
        <View
          style={[styles.gridRow, styles.gridHeader, { backgroundColor: colors.surfaceLow }]}
        >
          {indexes.map((index) => (
            <AppText
              key={index}
              variant="label"
              color="textSecondary"
              style={[styles.gridCell, { flex: flexFor(index) }]}
            >
              {columns[index] ?? ""}
            </AppText>
          ))}
        </View>
      ) : null}
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.gridRow,
            rowIndex > 0 || columns.length > 0
              ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineStrong }
              : null,
          ]}
        >
          {indexes.map((index) => (
            <AppText
              key={index}
              variant={index === 0 ? "headline" : "body"}
              selectable
              style={[styles.gridCell, { flex: flexFor(index) }]}
            >
              {row[index] ?? ""}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: Radii.lg,
    overflow: "hidden",
  },
  stackedRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  pairValue: {
    marginTop: Spacing.xxs,
  },
  labelledValue: {
    marginTop: Spacing.xs,
    gap: Spacing.xxs,
  },
  gridRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
  },
  gridHeader: {
    paddingVertical: Spacing.xs,
  },
  gridCell: {
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
});
