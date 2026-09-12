import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Radii, Shadows, Spacing } from "@/constants/theme";
import { getCategoryIcon } from "@/features/content/category-icon";
import type { CountryDocument } from "@/features/countries/country-service";
import { useTheme } from "@/hooks/use-theme";

type CountryDocumentRowProps = {
  document: CountryDocument;
  onPress: (document: CountryDocument) => void;
};

export const CountryDocumentRow = memo(function CountryDocumentRow({
  document,
  onPress,
}: CountryDocumentRowProps) {
  const { colors } = useTheme();
  const description = document.shortDescription ?? document.intro ?? "Complete guide";

  return (
    <PressableScale
      onPress={() => onPress(document)}
      scaleTo={0.985}
      pressedOpacity={0.94}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`Open ${document.title}`}
      style={[styles.card, Shadows.card, { backgroundColor: colors.surfaceLowest }]}
    >
      <IconBadge icon={getCategoryIcon(document.categoryIcon)} tone="primary" size={44} />
      <View style={styles.texts}>
        <AppText variant="headline" numberOfLines={2}>
          {document.title}
        </AppText>
        <AppText
          variant="footnote"
          color="textSecondary"
          numberOfLines={2}
          style={styles.description}
        >
          {description}
        </AppText>
        <View style={styles.chips}>
          <Chip label={document.categoryName} />
          {document.isPremium ? <Chip label="Pro" icon="sparkles" tone="dark" /> : null}
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textTertiary} weight="semibold" />
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    marginTop: Spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm + Spacing.xxs,
  },
});
