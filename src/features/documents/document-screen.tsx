import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ContentSections } from "@/components/content/content-sections";
import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Entrance } from "@/components/ui/entrance";
import { HeroCard } from "@/components/ui/hero-card";
import { IconButton } from "@/components/ui/icon-button";
import { NativeMenuButton } from "@/components/ui/native-menu-button";
import type { MenuAction } from "@/components/ui/native-menu-button.types";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-views";
import { Surface } from "@/components/ui/surface";
import { getCountryCodeBySlug } from "@/constants/country";
import { Radii, Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { PaywallCard } from "@/features/billing/paywall-card";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { getCategoryIcon } from "@/features/content/category-icon";
import {
  fetchVisaDocument,
  type VisaDocument,
} from "@/features/documents/document-service";
import { useIsDocumentSaved, useSavedStore } from "@/features/saved/saved-store";
import { haptic } from "@/lib/haptics";
import { showErrorToast, showSavedToast, showUnsavedToast } from "@/lib/toast";

const MAX_HERO_TAGS = 3;

export function DocumentScreen() {
  const router = useRouter();
  const { contentSource, savedItemsOwnerId } = useAuthAccess();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Array.isArray(id) ? id[0] : id;
  const { planStatus, isPremium, isPlanUnavailable, retryPlanCheck, requirePremium } =
    usePremiumGate();
  const requestIdRef = useRef(0);
  const [document, setDocument] = useState<VisaDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSaved = useIsDocumentSaved(document?.id);
  const pendingMutation = useSavedStore((state) =>
    document?.id ? state.pendingMutations[`document:${document.id}`] : undefined,
  );
  const hydrateSavedForUser = useSavedStore((state) => state.hydrateForUser);
  const saveDocumentOptimistic = useSavedStore((state) => state.saveDocumentOptimistic);
  const unsaveDocumentOptimistic = useSavedStore(
    (state) => state.unsaveDocumentOptimistic,
  );
  const isSaving = Boolean(pendingMutation);

  const load = useCallback(() => {
    if (!documentId) {
      setIsLoading(false);
      setError("Guide not found.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    fetchVisaDocument(documentId, contentSource)
      .then((nextDocument) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setDocument(nextDocument);
        setError(nextDocument ? null : "Guide not found.");
      })
      .catch((fetchError) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        console.warn("Unable to fetch visa document", fetchError);
        setDocument(null);
        setError("Unable to load this guide right now.");
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [contentSource, documentId]);

  // Guides are only readable with Premium (RLS for members, the purchase
  // check for guests), so wait for the plan.
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
    if (savedItemsOwnerId && isPremium) {
      void hydrateSavedForUser(savedItemsOwnerId);
    }
  }, [hydrateSavedForUser, isPremium, savedItemsOwnerId]);

  const toggleSaved = () => {
    if (!document) {
      return;
    }

    // Prompts on the Free plan, offers a retry when the plan could not be
    // checked, and waits quietly while it is still loading.
    if (!savedItemsOwnerId || !requirePremium("save")) {
      return;
    }

    if (!isSaved) {
      haptic.success();
      void saveDocumentOptimistic({
        ownerId: savedItemsOwnerId,
        documentId: document.id,
        document: {
          id: `document:${document.id}`,
          documentId: document.id,
          title: document.title,
          slug: document.slug,
          shortDescription: document.shortDescription,
          intro: document.intro,
          countryName: document.countryName,
          countrySlug: document.countrySlug,
          countryFlagEmoji: document.countryFlagEmoji,
          categoryName: document.categoryName,
          categorySlug: document.categorySlug,
          categoryIcon: document.categoryIcon,
          createdAt: new Date().toISOString(),
        },
      }).catch((saveError) => {
        console.warn("Unable to update saved document", saveError);
        showErrorToast("Could not save guide", "Please try again in a moment.");
      });
      showSavedToast(document.title, "document");
      return;
    }

    haptic.light();
    void unsaveDocumentOptimistic({ ownerId: savedItemsOwnerId, documentId: document.id }).catch(
      (unsaveError) => {
        console.warn("Unable to update saved document", unsaveError);
        showErrorToast("Could not remove guide", "Please try again in a moment.");
      },
    );
    showUnsavedToast(document.title, "document");
  };

  const openCountry = () => {
    if (document) {
      router.push(`/country/${document.countrySlug}`);
    }
  };

  const menuActions: MenuAction[] = [
    { key: "country", title: "View country guides", icon: "flag", onPress: openCountry },
    {
      key: "save",
      title: isSaved ? "Remove from saved" : "Save guide",
      icon: isSaved ? "trash" : "bookmark",
      destructive: isSaved,
      onPress: toggleSaved,
    },
  ];

  const overviewText = document
    ? (document.shortDescription ??
      document.intro ??
      `${document.countryName} ${document.categoryName.toLowerCase()} guide.`)
    : "";
  const sections = document?.contentJson.sections ?? [];

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          padded
          title={document?.countryName ?? "Guide"}
          right={
            <View style={styles.headerActions}>
              <IconButton
                icon={isSaved ? "bookmarkFill" : "bookmark"}
                variant={isSaved ? "success" : "glass"}
                disabled={!document || isSaving}
                accessibilityLabel={isSaved ? "Remove guide from saved" : "Save guide"}
                onPress={toggleSaved}
              />
              <NativeMenuButton actions={menuActions} accessibilityLabel="Guide options" />
            </View>
          }
        />
      }
      contentContainerStyle={styles.content}
    >
      {planStatus === "free" ? (
        <PaywallCard feature="document" onBack={() => router.back()} />
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
        <DocumentSkeleton />
      ) : null}

      {isPremium && !isLoading && error ? (
        <ErrorState
          title={error}
          message="Please go back and open the guide again."
          action={{ label: "Try again", onPress: load }}
          secondaryAction={{ label: "Go back", onPress: () => router.back() }}
        />
      ) : null}

      {isPremium && !isLoading && document ? (
        <>
          <Entrance index={0}>
            <HeroCard>
              <View style={styles.heroTop}>
                <CountryFlag
                  code={getCountryCodeBySlug(document.countrySlug)}
                  emoji={document.countryFlagEmoji}
                  size="md"
                />
                <View style={styles.heroChips}>
                  <Chip
                    label={document.categoryName}
                    icon={getCategoryIcon(document.categoryIcon)}
                    tone="inverse"
                  />
                  {document.isPremium ? (
                    <Chip label="Pro" icon="sparkles" tone="inverse" />
                  ) : null}
                </View>
              </View>
              <AppText variant="title1" color="onHero" style={styles.heroTitle}>
                {document.title}
              </AppText>
              <AppText variant="subhead" color="onHeroMuted" numberOfLines={3}>
                {overviewText}
              </AppText>
              {document.tags.length > 0 ? (
                <View style={styles.tags}>
                  {document.tags.slice(0, MAX_HERO_TAGS).map((tag) => (
                    <Chip key={tag} label={tag} tone="inverse" uppercase />
                  ))}
                </View>
              ) : null}
            </HeroCard>
          </Entrance>

          {document.intro && document.intro !== overviewText ? (
            <Entrance index={1} style={styles.section}>
              <Surface level={1}>
                <AppText variant="body" color="textSecondary">
                  {document.intro}
                </AppText>
              </Surface>
            </Entrance>
          ) : null}

          <View style={styles.section}>
            <ContentSections sections={sections} />
          </View>

          <Entrance index={sections.length + 2} style={styles.section}>
            <AppButton
              label={`All ${document.countryName} guides`}
              icon="flag"
              variant="secondary"
              onPress={openCountry}
            />
          </Entrance>
        </>
      ) : null}
    </Screen>
  );
}

function DocumentSkeleton() {
  return (
    <View>
      <Skeleton height={220} radius={Radii.hero} />
      <Skeleton height={96} radius={Radii.xl} style={styles.section} />
      <Skeleton height={160} radius={Radii.xl} style={styles.section} />
      <Skeleton height={160} radius={Radii.xl} style={styles.rowGap} />
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
    gap: Spacing.md,
  },
  heroChips: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexShrink: 1,
  },
  heroTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  section: {
    marginTop: Spacing.xl,
  },
  rowGap: {
    marginTop: Spacing.md,
  },
});
