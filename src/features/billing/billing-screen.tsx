import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { Entrance } from "@/components/ui/entrance";
import { HeroCard } from "@/components/ui/hero-card";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { Screen } from "@/components/ui/screen";
import { Spinner } from "@/components/ui/spinner";
import { Surface } from "@/components/ui/surface";
import { TabScreen } from "@/components/ui/tab-screen";
import { Radii, Spacing } from "@/constants/theme";
import { AuthNotice } from "@/features/auth/components/auth-layout";
import { premiumFeatures } from "@/features/billing/premium";
import { usePremiumPurchase } from "@/features/billing/use-premium-purchase";
import { useTheme } from "@/hooks/use-theme";

export function BillingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    planStatus,
    isSignedIn,
    isAwaitingActivation,
    priceLabel,
    isPriceLoading,
    priceError,
    reloadPrice,
    state,
    purchase,
    restore,
    refreshPlan,
  } = usePremiumPurchase();

  const isPremium = planStatus === "pro";
  const isBusy = state !== "idle";

  return (
    <TabScreen>
      <Screen scroll contentContainerStyle={styles.content}>
        <Entrance from="none">
          <AppText variant="display">Billing</AppText>
          <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
            {isPremium
              ? "Your Premium access is active on this account."
              : "One payment. Every guide, forever."}
          </AppText>
        </Entrance>

        {isPremium ? (
          <Entrance index={1} style={styles.section}>
            <Surface tone="success" style={styles.memberCard}>
              <IconBadge icon="crownFill" tone="success" size={56} radius="lg" />
              <AppText variant="title2" style={styles.memberTitle}>
                You are a Premium member
              </AppText>
              <AppText variant="body" color="textSecondary" style={styles.memberBody}>
                All country guides, visa documents, search and saves are unlocked. This
                was a one-time purchase, so there is nothing to renew.
              </AppText>
            </Surface>
          </Entrance>
        ) : (
          <Entrance index={1} style={styles.section}>
            <HeroCard>
              <View style={styles.heroTop}>
                <Chip label="Lifetime access" icon="crown" tone="inverse" uppercase />
                {planStatus === "free" && isSignedIn ? (
                  <Chip label="Free plan" tone="inverse" />
                ) : null}
              </View>
              <AppText variant="title2" color="onHero" style={styles.heroTitle}>
                EU Work Support Premium
              </AppText>
              <View style={styles.priceRow}>
                {priceLabel ? (
                  <AppText variant="display" color="onHero" style={styles.price}>
                    {priceLabel}
                  </AppText>
                ) : isPriceLoading ? (
                  <View style={styles.priceSpinner}>
                    <Spinner
                      size={28}
                      color={colors.onHero}
                      trackColor={colors.heroSurface}
                      accessibilityLabel="Loading price"
                    />
                  </View>
                ) : null}
                <AppText variant="subhead" color="onHeroMuted" style={styles.priceNote}>
                  {priceLabel || isPriceLoading ? "one-time payment" : "One-time payment"}
                </AppText>
              </View>
              <AppText variant="footnote" color="onHeroMuted">
                No subscription. No renewals. Pay once and keep access for life.
              </AppText>
            </HeroCard>
          </Entrance>
        )}

        <Entrance index={2} style={styles.section}>
          <AppText variant="eyebrow" color="textTertiary" style={styles.groupTitle}>
            {isPremium ? "Included in your plan" : "What you get"}
          </AppText>
          <Surface style={styles.featureList}>
            {premiumFeatures.map((feature, index) => (
              <View
                key={feature.title}
                style={[
                  styles.featureRow,
                  index > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outline }
                    : null,
                ]}
              >
                <IconBadge icon={feature.icon} tone="primary" size={40} iconSize={18} radius="sm" />
                <View style={styles.featureTexts}>
                  <AppText variant="headline">{feature.title}</AppText>
                  <AppText variant="footnote" color="textSecondary">
                    {feature.description}
                  </AppText>
                </View>
                <Icon name="checkCircle" size={18} color={colors.success} />
              </View>
            ))}
          </Surface>
        </Entrance>

        {state === "activating" || (isAwaitingActivation && state === "idle") ? (
          <Entrance style={styles.section}>
            <Surface tone="primary" style={styles.activating}>
              <Spinner size={22} />
              <AppText variant="callout" style={styles.activatingText}>
                {state === "activating"
                  ? "Payment confirmed. Activating your Premium access…"
                  : "Your App Store purchase was found. Premium is being activated on this account; tap refresh below if it does not appear within a few minutes."}
              </AppText>
            </Surface>
          </Entrance>
        ) : null}

        <Entrance index={3} style={styles.section}>
          {isPremium ? (
            <View style={styles.actions}>
              <AppButton
                label="Explore country guides"
                icon="compass"
                onPress={() => router.push("/")}
              />
              <AppButton
                label="Restore purchase"
                variant="ghost"
                size="md"
                loading={state === "restoring"}
                disabled={isBusy}
                onPress={restore}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              {!isSignedIn ? (
                <AuthNotice
                  tone="primary"
                  icon="info"
                  text="Log in or create an account first so Premium is linked to you."
                />
              ) : null}
              {priceError ? (
                <>
                  <AuthNotice tone="error" icon="warning" text={priceError} />
                  <AppButton
                    label="Try again"
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    disabled={isBusy}
                    haptic="selection"
                    onPress={() => void reloadPrice()}
                  />
                </>
              ) : null}
              <AppButton
                label={priceLabel ? `Buy Premium · ${priceLabel}` : "Buy Premium"}
                icon="crown"
                loading={state === "purchasing" || state === "activating"}
                disabled={isBusy}
                onPress={purchase}
              />
              <AppButton
                label="Restore purchase"
                variant="ghost"
                size="md"
                loading={state === "restoring"}
                disabled={isBusy}
                onPress={restore}
              />
              {isSignedIn ? (
                <AppButton
                  label="Already paid? Refresh status"
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  haptic="selection"
                  onPress={() => void refreshPlan()}
                />
              ) : null}
            </View>
          )}
        </Entrance>

        <AppText variant="caption" color="textTertiary" align="center" style={styles.legal}>
          Payment is charged to your App Store account. Premium is a one-time purchase
          with no automatic renewal. See our{" "}
          <AppText
            variant="caption"
            color="primary"
            accessibilityRole="link"
            onPress={() => router.push("/profile/legal/terms-and-conditions")}
          >
            Terms
          </AppText>{" "}
          and{" "}
          <AppText
            variant="caption"
            color="primary"
            accessibilityRole="link"
            onPress={() => router.push("/profile/legal/privacy-policy")}
          >
            Privacy Policy
          </AppText>
          .
        </AppText>
      </Screen>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  heroTitle: {
    marginTop: Spacing.xl,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  price: {
    fontSize: 44,
    lineHeight: 50,
  },
  priceSpinner: {
    height: 50,
    justifyContent: "center",
  },
  priceNote: {
    flexShrink: 1,
  },
  groupTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  featureList: {
    padding: 0,
    paddingHorizontal: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  featureTexts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  memberCard: {
    padding: Spacing.xxl,
  },
  memberTitle: {
    marginTop: Spacing.lg,
  },
  memberBody: {
    marginTop: Spacing.sm,
  },
  activating: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radii.lg,
  },
  activatingText: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    gap: Spacing.sm,
  },
  legal: {
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
});
