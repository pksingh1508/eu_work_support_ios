import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Entrance } from "@/components/ui/entrance";
import { HeroCard } from "@/components/ui/hero-card";
import { Icon } from "@/components/ui/icon";
import { IconBadge } from "@/components/ui/icon-badge";
import { IconButton } from "@/components/ui/icon-button";
import { NativeMenuButton } from "@/components/ui/native-menu-button";
import type { MenuAction } from "@/components/ui/native-menu-button.types";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-views";
import { Surface } from "@/components/ui/surface";
import { getCountryCodeBySlug, getCountryNameBySlug } from "@/constants/country";
import { Radii, Spacing } from "@/constants/theme";
import { CountryDocumentRow } from "@/features/countries/country-document-row";
import {
  fetchCountry,
  type Country,
  type CountryDocument,
} from "@/features/countries/country-service";
import { DocumentSheet } from "@/features/countries/document-sheet";
import { PaywallCard } from "@/features/billing/paywall-card";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { useIsCountrySaved, useSavedStore } from "@/features/saved/saved-store";
import { useTheme } from "@/hooks/use-theme";
import { formatLongDate } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { showErrorToast, showSavedToast, showUnsavedToast } from "@/lib/toast";
import { normalizeExternalUrl, openExternalUrl } from "@/lib/url";

const POPULAR_RANK_THRESHOLD = 10;

export function CountryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const countrySlug = Array.isArray(slug) ? slug[0] : slug;
  const { planStatus, isPremium, isPlanUnavailable, retryPlanCheck, showPremiumRequired } =
    usePremiumGate();
  const offlineCountryName = getCountryNameBySlug(countrySlug);
  const requestIdRef = useRef(0);
  const [country, setCountry] = useState<Country | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<CountryDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSaved = useIsCountrySaved(country?.id);
  const pendingMutation = useSavedStore((state) =>
    country?.id ? state.pendingMutations[`country:${country.id}`] : undefined,
  );
  const hydrateSavedForUser = useSavedStore((state) => state.hydrateForUser);
  const saveCountryOptimistic = useSavedStore((state) => state.saveCountryOptimistic);
  const unsaveCountryOptimistic = useSavedStore(
    (state) => state.unsaveCountryOptimistic,
  );
  const isSaving = Boolean(pendingMutation);

  const load = useCallback(() => {
    if (!countrySlug) {
      setIsLoading(false);
      setError("Country not found.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    fetchCountry(countrySlug)
      .then((nextCountry) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setCountry(nextCountry);
        setError(nextCountry ? null : "Country not found.");
      })
      .catch((fetchError) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        console.warn("Unable to fetch country details", fetchError);
        setCountry(null);
        setError("Unable to load this country right now.");
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [countrySlug]);

  // Country rows are only readable by Premium members (RLS), so do not fetch
  // until the plan is known and allows it.
  useEffect(() => {
    if (!isPremium) {
      return;
    }

    load();

    return () => {
      requestIdRef.current += 1;
    };
  }, [isPremium, load]);

  useEffect(() => {
    if (userId && isPremium) {
      void hydrateSavedForUser(userId);
    }
  }, [hydrateSavedForUser, isPremium, userId]);

  const categories = useMemo(
    () =>
      Array.from(new Set(country?.documents.map((document) => document.categoryName) ?? [])),
    [country],
  );

  const flagCode = getCountryCodeBySlug(country?.slug ?? countrySlug);
  const officialUrl = normalizeExternalUrl(country?.officialUrl);
  const officialImmigrationUrl = normalizeExternalUrl(country?.officialImmigrationUrl);
  const lastReviewedDate = formatLongDate(country?.lastReviewedAt);
  const isPopular =
    country?.popularityRank != null && country.popularityRank <= POPULAR_RANK_THRESHOLD;
  const overviewText =
    country?.shortDescription ??
    `${country?.name ?? "This country"} visa, immigration, work, study and document guidance.`;

  const toggleSaved = () => {
    if (!country) {
      return;
    }

    if (!userId) {
      Alert.alert("Log in required", "Please log in to save countries.");
      return;
    }

    if (!isPremium) {
      showPremiumRequired("save");
      return;
    }

    if (!isSaved) {
      haptic.success();
      void saveCountryOptimistic({
        clerkUserId: userId,
        countryId: country.id,
        country: {
          id: `country:${country.id}`,
          countryId: country.id,
          slug: country.slug,
          name: country.name,
          flagEmoji: country.flagEmoji,
          shortDescription: country.shortDescription,
          createdAt: new Date().toISOString(),
        },
      }).catch((saveError) => {
        console.warn("Unable to update saved country", saveError);
        showErrorToast("Could not save country", "Please try again in a moment.");
      });
      showSavedToast(country.name, "country");
      return;
    }

    haptic.light();
    void unsaveCountryOptimistic({ clerkUserId: userId, countryId: country.id }).catch(
      (unsaveError) => {
        console.warn("Unable to update saved country", unsaveError);
        showErrorToast("Could not remove country", "Please try again in a moment.");
      },
    );
    showUnsavedToast(country.name, "country");
  };

  const menuActions: MenuAction[] = [
    ...(officialUrl
      ? [
          {
            key: "official",
            title: "Official website",
            icon: "globe" as const,
            onPress: () => openExternalUrl(officialUrl, "the official website"),
          },
        ]
      : []),
    ...(officialImmigrationUrl
      ? [
          {
            key: "immigration",
            title: "Immigration website",
            icon: "idCard" as const,
            onPress: () =>
              openExternalUrl(officialImmigrationUrl, "the immigration website"),
          },
        ]
      : []),
    {
      key: "save",
      title: isSaved ? "Remove from saved" : "Save country",
      icon: isSaved ? ("trash" as const) : ("bookmark" as const),
      destructive: isSaved,
      onPress: toggleSaved,
    },
  ];

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          padded
          title={country?.name ?? offlineCountryName ?? "Country"}
          right={
            <View style={styles.headerActions}>
              <IconButton
                icon={isSaved ? "bookmarkFill" : "bookmark"}
                variant={isSaved ? "success" : "glass"}
                disabled={!country || isSaving}
                accessibilityLabel={
                  isSaved
                    ? `Remove ${country?.name ?? "country"} from saved`
                    : `Save ${country?.name ?? "country"}`
                }
                onPress={toggleSaved}
              />
              <NativeMenuButton actions={menuActions} accessibilityLabel="Country options" />
            </View>
          }
        />
      }
      contentContainerStyle={styles.content}
    >
      {planStatus === "free" ? (
        <PaywallCard
          feature="country"
          subject={offlineCountryName}
          onBack={() => router.back()}
        />
      ) : null}

      {isPlanUnavailable ? (
        <ErrorState
          title="Unable to check your plan"
          message="Check your connection and try again."
          action={{ label: "Try again", onPress: () => void retryPlanCheck() }}
          secondaryAction={{ label: "Go back", onPress: () => router.back() }}
        />
      ) : null}

      {(planStatus === "unknown" && !isPlanUnavailable) || (isPremium && isLoading) ? (
        <CountrySkeleton />
      ) : null}

      {isPremium && !isLoading && error ? (
        <ErrorState
          title={error}
          message="Check your connection and try again."
          action={{ label: "Try again", onPress: load }}
          secondaryAction={{ label: "Go back", onPress: () => router.back() }}
        />
      ) : null}

      {isPremium && !isLoading && country ? (
        <>
          <Entrance index={0}>
            <HeroCard>
              <View style={styles.heroTop}>
                <CountryFlag code={flagCode} emoji={country.flagEmoji} size="lg" />
                {isPopular ? <Chip label="Popular" icon="star" tone="inverse" uppercase /> : null}
              </View>
              <AppText variant="display" color="onHero" style={styles.heroTitle}>
                {country.name}
              </AppText>
              <AppText variant="subhead" color="onHeroMuted" numberOfLines={2}>
                {categories.length > 0
                  ? categories.slice(0, 3).join(" · ")
                  : "Visa, permits and documents"}
              </AppText>
              <View style={styles.stats}>
                <HeroStat value={`${country.documents.length}`} label="guides available" />
                <HeroStat value={`${categories.length}`} label="topics covered" />
              </View>
            </HeroCard>
          </Entrance>

          <Entrance index={1} style={styles.section}>
            <Surface>
              <View style={styles.overviewHeader}>
                <IconBadge icon="info" tone="primary" size={36} iconSize={18} radius="sm" />
                <AppText variant="title3">Overview</AppText>
              </View>
              <AppText variant="body" color="textSecondary" style={styles.overviewBody}>
                {overviewText}
              </AppText>
            </Surface>
          </Entrance>

          <Entrance index={2} style={styles.section}>
            <SectionHeading
              title="Guides"
              eyebrow={`${country.documents.length} ${
                country.documents.length === 1 ? "document" : "documents"
              }`}
            />
          </Entrance>

          {country.documents.map((document, index) => (
            <Entrance key={document.id} index={index + 3} style={styles.row}>
              <CountryDocumentRow document={document} onPress={setSelectedDocument} />
            </Entrance>
          ))}

          {country.documents.length === 0 ? (
            <Surface level={1} style={styles.row}>
              <AppText variant="callout" color="textSecondary" align="center">
                Guides for this country are being prepared.
              </AppText>
            </Surface>
          ) : null}

          {officialUrl || officialImmigrationUrl || lastReviewedDate ? (
            <Entrance index={country.documents.length + 3} style={styles.section}>
              <Surface level={1}>
                <AppText variant="eyebrow" color="textTertiary">
                  Source information
                </AppText>
                {lastReviewedDate ? (
                  <View style={styles.reviewed}>
                    <Icon name="checkCircle" size={18} color={colors.success} />
                    <AppText variant="footnote" color="textSecondary">
                      Last reviewed {lastReviewedDate}
                    </AppText>
                  </View>
                ) : null}
                {officialUrl ? (
                  <SourceLink title="Official website" url={officialUrl} />
                ) : null}
                {officialImmigrationUrl ? (
                  <SourceLink title="Official immigration website" url={officialImmigrationUrl} />
                ) : null}
              </Surface>
            </Entrance>
          ) : null}
        </>
      ) : null}

      <DocumentSheet document={selectedDocument} onClose={() => setSelectedDocument(null)} />
    </Screen>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.stat, { backgroundColor: colors.heroSurface }]}>
      <AppText variant="title2" color="onHero">
        {value}
      </AppText>
      <AppText variant="caption" color="onHeroMuted">
        {label}
      </AppText>
    </View>
  );
}

function SourceLink({ title, url }: { title: string; url: string }) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => openExternalUrl(url, `the ${title.toLowerCase()}`)}
      scaleTo={0.985}
      accessibilityRole="link"
      accessibilityLabel={`Open ${title.toLowerCase()}`}
      accessibilityHint="Opens the website in your browser"
      style={[styles.sourceLink, { backgroundColor: colors.surfaceLowest }]}
    >
      <IconBadge icon="globe" tone="primary" size={36} iconSize={16} radius="sm" />
      <View style={styles.sourceTexts}>
        <AppText variant="callout" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="textTertiary" numberOfLines={1}>
          {url}
        </AppText>
      </View>
      <Icon name="arrowUpRight" size={16} color={colors.textTertiary} />
    </PressableScale>
  );
}

function CountrySkeleton() {
  return (
    <View>
      <Skeleton height={236} radius={Radii.hero} />
      <Skeleton height={120} radius={Radii.xl} style={styles.section} />
      <Skeleton width={140} height={22} style={styles.section} />
      <Skeleton height={104} radius={Radii.xl} style={styles.row} />
      <Skeleton height={104} radius={Radii.xl} style={styles.row} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    marginTop: Spacing.xl,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  stat: {
    flex: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xxs,
  },
  section: {
    marginTop: Spacing.xl,
  },
  row: {
    marginTop: Spacing.md,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  overviewBody: {
    marginTop: Spacing.md,
  },
  reviewed: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  sourceTexts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
});
