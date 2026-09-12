import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Icon } from "@/components/ui/icon";
import { NativeMenuButton } from "@/components/ui/native-menu-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { getCountryCodeBySlug } from "@/constants/country";
import { Radii, Shadows, Spacing } from "@/constants/theme";
import { getCategoryIcon } from "@/features/content/category-icon";
import type { SavedItem } from "@/features/saved/saved-items";
import { useTheme } from "@/hooks/use-theme";
import { formatSavedDate } from "@/lib/format";

type SavedCardProps = {
  item: SavedItem;
  isRemoving: boolean;
  onOpen: (item: SavedItem) => void;
  onRemove: (item: SavedItem) => void;
};

export const SavedCard = memo(function SavedCard({
  item,
  isRemoving,
  onOpen,
  onRemove,
}: SavedCardProps) {
  const { colors } = useTheme();
  const isCountry = item.type === "country";
  const title = isCountry ? item.name : item.title;
  const eyebrow = isCountry ? "Country guide" : item.countryName;
  const flagEmoji = isCountry ? item.flagEmoji : item.countryFlagEmoji;
  const flagCode = getCountryCodeBySlug(isCountry ? item.slug : item.countrySlug);
  const description = isCountry
    ? item.shortDescription
    : (item.shortDescription ?? item.intro);
  const chipLabel = isCountry ? "Country" : item.categoryName;
  const chipIcon = isCountry ? "flag" : getCategoryIcon(item.categoryIcon);

  return (
    <PressableScale
      onPress={() => onOpen(item)}
      scaleTo={0.985}
      pressedOpacity={0.94}
      disabled={isRemoving}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={[
        styles.card,
        Shadows.card,
        { backgroundColor: colors.surfaceLowest },
        isRemoving ? styles.removing : null,
      ]}
    >
      <View style={styles.header}>
        <CountryFlag code={flagCode} emoji={flagEmoji} size="md" />
        <View style={styles.titles}>
          <AppText variant="eyebrow" color="primary" numberOfLines={1}>
            {eyebrow}
          </AppText>
          <AppText variant="title3" numberOfLines={2}>
            {title}
          </AppText>
        </View>
        <NativeMenuButton
          size={36}
          variant="tonal"
          accessibilityLabel={`Options for ${title}`}
          actions={[
            { key: "open", title: "Open guide", icon: "arrowUpRight", onPress: () => onOpen(item) },
            {
              key: "remove",
              title: "Remove from saved",
              icon: "trash",
              destructive: true,
              onPress: () => onRemove(item),
            },
          ]}
        />
      </View>

      {description ? (
        <AppText
          variant="subhead"
          color="textSecondary"
          numberOfLines={2}
          style={styles.description}
        >
          {description}
        </AppText>
      ) : null}

      <View style={styles.footer}>
        <Chip label={chipLabel} icon={chipIcon} tone="neutral" />
        <View style={styles.saved}>
          <Icon name="clock" size={14} color={colors.textTertiary} />
          <AppText variant="caption" color="textTertiary">
            {formatSavedDate(item.createdAt)}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    padding: Spacing.xl,
  },
  removing: {
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  titles: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  description: {
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  saved: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
});
