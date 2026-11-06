import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Share, StyleSheet, View, type ScrollView } from "react-native";

import { ContentSections } from "@/components/content/content-sections";
import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-views";
import { getCountryCodeBySlug } from "@/constants/country";
import { Layout, Radii, Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { PaywallCard } from "@/features/billing/paywall-card";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { getCategoryIcon } from "@/features/content/category-icon";
import {
  fetchVisaDocument,
  getPrimedVisaDocument,
  type VisaDocument,
} from "@/features/documents/document-service";
import { useIsDocumentSaved, useSavedStore } from "@/features/saved/saved-store";
import { haptic } from "@/lib/haptics";
import { showErrorToast } from "@/lib/toast";

const MAX_HERO_TAGS = 3;

export function DocumentScreen() {
  const router = useRouter();
  const { contentSource, savedItemsOwnerId } = useAuthAccess();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Array.isArray(id) ? id[0] : id;
  const { planStatus, isPremium, isPlanUnavailable, retryPlanCheck, requirePremium } =
    usePremiumGate();
  const requestIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const headerHeight = useHeaderHeight();
  const sectionsTopRef = useRef(0);
  const sectionOffsetsRef = useRef<Record<number, number>>({});
  const [document, setDocument] = useState<VisaDocument | null>(() =>
    getPrimedVisaDocument(documentId),
  );
  const [isLoading, setIsLoading] = useState(() => !getPrimedVisaDocument(documentId));
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
    // A guide primed by the country screen stays on screen while it refreshes.
    const hasPrimed = Boolean(getPrimedVisaDocument(documentId));
    setIsLoading(!hasPrimed);
    setError(null);

    fetchVisaDocument(documentId, contentSource)
      .then((nextDocument) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (nextDocument || !hasPrimed) {
          setDocument(nextDocument);
          setError(nextDocument ? null : "Guide not found.");
        }
      })
      .catch((fetchError) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        console.warn("Unable to fetch visa document", fetchError);
        if (!hasPrimed) {
          setDocument(null);
          setError("Unable to load this guide right now.");
        }
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
      return;
    }

    haptic.light();
    void unsaveDocumentOptimistic({ ownerId: savedItemsOwnerId, documentId: document.id }).catch(
      (unsaveError) => {
        console.warn("Unable to update saved document", unsaveError);
        showErrorToast("Could not remove guide", "Please try again in a moment.");
      },
    );
  };

  const shareGuide = () => {
    if (!document) {
      return;
    }

    void Share.share({
      title: document.title,
      message: [document.title, document.shortDescription].filter(Boolean).join("\n\n"),
      url: `euworksupport://visa/${document.id}`,
    });
  };

  const jumpToSection = (index: number) => {
    const offset = sectionOffsetsRef.current[index];
    if (offset == null) {
      return;
    }

    haptic.selection();
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionsTopRef.current + offset - headerHeight - Spacing.md),
      animated: true,
    });
  };

  const openCountry = () => {
    if (document) {
      router.push(`/country/${document.countrySlug}`);
    }
  };

  const overviewText = document
    ? (document.shortDescription ??
      document.intro ??
      `${document.countryName} ${document.categoryName.toLowerCase()} guide.`)
    : "";
  const sections = document?.contentJson.sections ?? [];
  const outline = sections
    .map((section, index) => ({ index, title: section.title?.trim() ?? "" }))
    .filter((entry) => entry.title.length > 0);

  return (
    <Screen
      nativeHeader
      scroll
      scrollRef={scrollRef}
      contentContainerStyle={styles.content}
    >
      {/* Text-dense page: a hard edge keeps scrolled lines from showing
          through behind the bar title. */}
      <Stack.Screen
        options={{ title: document?.countryName ?? "", scrollEdgeEffects: { top: "hard" } }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={isSaved ? "bookmark.fill" : "bookmark"}
          disabled={!document || isSaving}
          accessibilityLabel={isSaved ? "Remove guide from saved" : "Save guide"}
          onPress={toggleSaved}
        />
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="Guide options">
          {outline.length > 1 ? (
            <Stack.Toolbar.Menu title="On This Page" icon="list.bullet">
              {outline.map((entry) => (
                <Stack.Toolbar.MenuAction
                  key={entry.index}
                  onPress={() => jumpToSection(entry.index)}
                >
                  {entry.title}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
          ) : null}
          <Stack.Toolbar.MenuAction icon="square.and.arrow.up" onPress={shareGuide}>
            Share
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="flag" onPress={openCountry}>
            {document ? `All ${document.countryName} Guides` : "Country Guides"}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

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

      {!document &&
      ((planStatus === "unknown" && !isPlanUnavailable) || (isPremium && isLoading)) ? (
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

      {isPremium && document ? (
        <>
          {/* Reading header: plain type on the page, no dark card above the text. */}
          <View style={styles.meta}>
            <CountryFlag
              code={getCountryCodeBySlug(document.countrySlug)}
              emoji={document.countryFlagEmoji}
              size="sm"
            />
            <Chip
              label={document.categoryName}
              icon={getCategoryIcon(document.categoryIcon)}
              tone="primary"
            />
          </View>
          <AppText variant="title1" accessibilityRole="header" selectable style={styles.title}>
            {document.title}
          </AppText>
          {overviewText ? (
            <AppText variant="reading" color="textSecondary" selectable>
              {overviewText}
            </AppText>
          ) : null}
          {document.tags.length > 0 ? (
            <View style={styles.tags}>
              {document.tags.slice(0, MAX_HERO_TAGS).map((tag) => (
                <Chip key={tag} label={tag} tone="neutral" />
              ))}
            </View>
          ) : null}

          {document.intro && document.intro !== overviewText ? (
            <AppText variant="reading" selectable style={styles.section}>
              {document.intro}
            </AppText>
          ) : null}

          <View
            style={styles.section}
            onLayout={(event) => {
              sectionsTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <ContentSections
              sections={sections}
              onSectionLayout={(index, y) => {
                sectionOffsetsRef.current[index] = y;
              }}
            />
          </View>

          <View style={styles.footer}>
            <AppButton
              label={`All ${document.countryName} guides`}
              icon="flag"
              variant="secondary"
              onPress={openCountry}
            />
          </View>
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
  // One reading column: ~65 characters per line at most, centred on wide
  // windows (iPhone Duo open, iPad).
  content: {
    maxWidth: Layout.proseMaxWidth + Layout.screenPadding * 2,
    paddingTop: Spacing.sm,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  footer: {
    marginTop: Spacing.huge,
  },
  rowGap: {
    marginTop: Spacing.md,
  },
});
