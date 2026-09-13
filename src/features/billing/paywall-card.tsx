import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";
import { Radii, Spacing } from "@/constants/theme";
import {
  getGatedFeatureCopy,
  premiumFeatures,
  type GatedFeature,
} from "@/features/billing/premium";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { usePremiumPriceLabel } from "@/features/billing/purchases";
import { useTheme } from "@/hooks/use-theme";

type PaywallCardProps = {
  feature: GatedFeature;
  /** Country or guide name, used to personalise the copy. */
  subject?: string | null;
  onBack?: () => void;
  /** Fewer feature rows for inline placements (Saved tab). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const COMPACT_FEATURE_COUNT = 3;

/**
 * Free-plan message shown in place of Premium content, with the store's
 * localised one-time price (once loaded) and a "Buy Premium" action that
 * opens the Billing tab.
 */
export function PaywallCard({ feature, subject, onBack, compact = false, style }: PaywallCardProps) {
  const { colors } = useTheme();
  const { openBilling } = usePremiumGate();
  const priceLabel = usePremiumPriceLabel();
  const { title, message } = getGatedFeatureCopy(feature, subject);
  const features = compact ? premiumFeatures.slice(0, COMPACT_FEATURE_COUNT) : premiumFeatures;

  return (
    <Entrance style={style}>
      <Surface style={styles.card}>
        <View style={styles.top}>
          <IconBadge icon="crown" tone="tertiary" size={64} radius="lg" />
          <Chip label="Free plan" icon="person" tone="neutral" />
        </View>

        <AppText variant="title2" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.message}>
          {message}
        </AppText>

        <View style={styles.features}>
          {features.map((item) => (
            <View key={item.title} style={styles.featureRow}>
              <Icon name="checkCircle" size={18} color={colors.success} />
              <AppText variant="callout" style={styles.featureText}>
                {item.title}
              </AppText>
            </View>
          ))}
        </View>

        <View style={[styles.priceRow, { backgroundColor: colors.surfaceLow }]}>
          <View style={styles.priceTexts}>
            <AppText variant="eyebrow" color="textTertiary">
              Premium
            </AppText>
            <AppText variant="footnote" color="textSecondary">
              One-time payment · lifetime access
            </AppText>
          </View>
          {priceLabel ? (
            <AppText variant="title1" color="primary">
              {priceLabel}
            </AppText>
          ) : null}
        </View>

        <View style={styles.actions}>
          <AppButton label="Buy Premium" icon="crown" onPress={openBilling} />
          {onBack ? (
            <AppButton label="Go back" variant="ghost" size="md" onPress={onBack} />
          ) : null}
        </View>
      </Surface>
    </Entrance>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xxl,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    marginTop: Spacing.xl,
  },
  message: {
    marginTop: Spacing.sm,
  },
  features: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureText: {
    flex: 1,
    minWidth: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  priceTexts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
});
