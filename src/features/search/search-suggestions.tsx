import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Radii, Spacing } from "@/constants/theme";
import { suggestedQueries } from "@/features/search/search-service";
import { useTheme } from "@/hooks/use-theme";

type SearchSuggestionsProps = {
  recentSearches: string[];
  onSelect: (query: string) => void;
  onRemoveRecent: (query: string) => void;
};

export function SearchSuggestions({
  recentSearches,
  onSelect,
  onRemoveRecent,
}: SearchSuggestionsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {recentSearches.length > 0 ? (
        <Entrance index={0}>
          <ListGroup title="Recent searches" separatorInset={Spacing.lg + 20 + Spacing.md}>
            {recentSearches.map((query) => (
              <PressableScale
                key={query}
                onPress={() => onSelect(query)}
                scaleTo={0.99}
                pressedOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Search ${query}`}
                style={styles.recentRow}
              >
                <Icon name="clock" size={20} color={colors.textTertiary} />
                <AppText variant="callout" numberOfLines={1} style={styles.recentLabel}>
                  {query}
                </AppText>
                <IconButton
                  icon="close"
                  variant="plain"
                  size={32}
                  iconSize={14}
                  iconColor={colors.textTertiary}
                  haptic="selection"
                  accessibilityLabel={`Remove ${query} from recent searches`}
                  onPress={() => onRemoveRecent(query)}
                />
              </PressableScale>
            ))}
          </ListGroup>
        </Entrance>
      ) : null}

      <Entrance index={1}>
        <AppText variant="eyebrow" color="textTertiary" style={styles.suggestionsTitle}>
          Try searching for
        </AppText>
        <View style={styles.chips}>
          {suggestedQueries.map((query) => (
            <PressableScale
              key={query}
              onPress={() => onSelect(query)}
              scaleTo={0.95}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={`Search ${query}`}
              style={[styles.chip, { backgroundColor: colors.surfaceHigh }]}
            >
              <Icon name="search" size={14} color={colors.primary} />
              <AppText variant="label" color="primary">
                {query}
              </AppText>
            </PressableScale>
          ))}
        </View>
      </Entrance>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxl,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 56,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  recentLabel: {
    flex: 1,
    minWidth: 0,
  },
  suggestionsTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + Spacing.xxs,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
  },
});
