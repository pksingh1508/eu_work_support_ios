import { Children, Fragment, type PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { LIST_ROW_ICON_SIZE } from "@/components/ui/list-row";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ListGroupProps = PropsWithChildren<{
  title?: string;
  footer?: string;
  /** Left inset of the separators. Defaults to aligning after the row icon. */
  separatorInset?: number;
  style?: StyleProp<ViewStyle>;
}>;

const DEFAULT_SEPARATOR_INSET = Spacing.lg + LIST_ROW_ICON_SIZE + Spacing.md;

/**
 * Inset-grouped list container. Rows are separated by a ghost hairline.
 */
export function ListGroup({
  title,
  footer,
  separatorInset = DEFAULT_SEPARATOR_INSET,
  style,
  children,
}: ListGroupProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      {title ? (
        <AppText variant="eyebrow" color="textTertiary" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <Surface padding={0} style={styles.surface}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View
                style={[
                  styles.separator,
                  { marginLeft: separatorInset, backgroundColor: colors.outline },
                ]}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </Surface>
      {footer ? (
        <AppText variant="footnote" color="textTertiary" style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  surface: {
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
});
