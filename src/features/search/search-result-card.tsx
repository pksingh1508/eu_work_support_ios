import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { getCountryCodeBySlug } from "@/constants/country";
import { Radii, Shadows, Spacing } from "@/constants/theme";
import type { SearchResult } from "@/features/search/search-service";
import { useTheme } from "@/hooks/use-theme";

type SearchResultCardProps = {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
};

export const SearchResultCard = memo(function SearchResultCard({
  result,
  onPress,
}: SearchResultCardProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => onPress(result)}
      scaleTo={0.985}
      pressedOpacity={0.94}
      accessibilityRole="button"
      accessibilityLabel={`Open ${result.title}`}
      style={[styles.card, Shadows.card, { backgroundColor: colors.surfaceLowest }]}
    >
      <View style={styles.meta}>
        <CountryFlag
          code={getCountryCodeBySlug(result.countrySlug)}
          emoji={result.flagEmoji}
          size="sm"
        />
        <AppText variant="eyebrow" color="primary" numberOfLines={1} style={styles.country}>
          {result.countryName}
        </AppText>
        <Chip label={result.categoryName} />
      </View>

      <AppText variant="title3" style={styles.title}>
        {result.title}
      </AppText>

      {result.shortDescription ? (
        <AppText
          variant="subhead"
          color="textSecondary"
          numberOfLines={3}
          style={styles.description}
        >
          {result.shortDescription}
        </AppText>
      ) : null}

      <View style={styles.footer}>
        {result.isPremium ? (
          <Chip label="Pro guide" icon="sparkles" tone="dark" />
        ) : (
          <View />
        )}
        <View style={[styles.arrow, { backgroundColor: colors.primarySoft }]}>
          <Icon name="arrowRight" size={16} color={colors.primary} weight="bold" />
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
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  country: {
    flexShrink: 1,
  },
  title: {
    marginTop: Spacing.md,
  },
  description: {
    marginTop: Spacing.sm,
  },
  footer: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
