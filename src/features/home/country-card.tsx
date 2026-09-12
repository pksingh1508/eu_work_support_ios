import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import type { CountryName } from "@/constants/country";
import { Radii, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type CountryCardProps = {
  country: CountryName;
  code: string;
  summary: string;
  demand: string;
  canSave: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onPress: (country: CountryName) => void;
  onToggleSave: (country: CountryName) => void;
};

/**
 * Country row on Home. Memoised so list re-renders only touch changed rows.
 */
export const CountryCard = memo(function CountryCard({
  country,
  code,
  summary,
  demand,
  canSave,
  isSaved,
  isSaving,
  onPress,
  onToggleSave,
}: CountryCardProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => onPress(country)}
      scaleTo={0.985}
      pressedOpacity={0.94}
      accessibilityRole="button"
      accessibilityLabel={`Open ${country} guides`}
      style={[styles.card, Shadows.card, { backgroundColor: colors.surfaceLowest }]}
    >
      <View style={styles.row}>
        <CountryFlag code={code} size="md" />
        <View style={styles.texts}>
          <AppText variant="title3" numberOfLines={1}>
            {country}
          </AppText>
          <AppText variant="subhead" color="textSecondary" numberOfLines={2}>
            {summary}
          </AppText>
        </View>
        {canSave ? (
          <IconButton
            icon={isSaved ? "bookmarkFill" : "bookmark"}
            variant={isSaved ? "success" : "plain"}
            size={40}
            iconSize={20}
            iconColor={isSaved ? undefined : colors.textTertiary}
            disabled={isSaving}
            haptic="none"
            accessibilityLabel={isSaved ? `Remove ${country} from saved` : `Save ${country}`}
            onPress={() => onToggleSave(country)}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Chip label={demand} tone="primary" icon="trending" />
        <View style={styles.explore}>
          <AppText variant="label" color="primary">
            Explore
          </AppText>
          <Icon name="arrowRight" size={14} color={colors.primary} weight="bold" />
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  explore: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
});
