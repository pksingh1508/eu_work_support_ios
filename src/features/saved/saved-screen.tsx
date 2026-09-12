import { useAuth } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, type ListRenderItem } from "react-native";
import Animated from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Entrance, listLayoutTransition } from "@/components/ui/entrance";
import { FilterBar, type FilterOption } from "@/components/ui/filter-bar";
import { Screen } from "@/components/ui/screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { TabScreen } from "@/components/ui/tab-screen";
import { Layout, Spacing } from "@/constants/theme";
import { PaywallCard } from "@/features/billing/paywall-card";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { SavedCard } from "@/features/saved/saved-card";
import {
  filterSavedItems,
  mergeSavedItems,
  savedItemKey,
  type SavedFilter,
  type SavedItem,
} from "@/features/saved/saved-items";
import { useSavedStore } from "@/features/saved/saved-store";
import { haptic } from "@/lib/haptics";
import { showErrorToast, showUnsavedToast } from "@/lib/toast";

const filterOptions: readonly FilterOption<SavedFilter>[] = [
  { key: "all", label: "All" },
  { key: "countries", label: "Countries" },
  { key: "documents", label: "Guides" },
];

export function SavedScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { planStatus, isPremium } = usePremiumGate();
  const countries = useSavedStore((state) => state.countries);
  const documents = useSavedStore((state) => state.documents);
  const status = useSavedStore((state) => state.status);
  const pendingMutations = useSavedStore((state) => state.pendingMutations);
  const hydrateForUser = useSavedStore((state) => state.hydrateForUser);
  const refresh = useSavedStore((state) => state.refresh);
  const resetSavedStore = useSavedStore((state) => state.reset);
  const unsaveCountryOptimistic = useSavedStore(
    (state) => state.unsaveCountryOptimistic,
  );
  const unsaveDocumentOptimistic = useSavedStore(
    (state) => state.unsaveDocumentOptimistic,
  );
  const [filter, setFilter] = useState<SavedFilter>("all");

  const savedItems = useMemo(
    () => mergeSavedItems(countries, documents),
    [countries, documents],
  );
  const visibleItems = useMemo(
    () => filterSavedItems(savedItems, filter),
    [filter, savedItems],
  );

  const isLoading = status === "loading" && savedItems.length === 0;
  const hasError = status === "error" && savedItems.length === 0;

  useFocusEffect(
    useCallback(() => {
      if (!userId || !isPremium) {
        resetSavedStore();
        return;
      }

      void hydrateForUser(userId);
    }, [hydrateForUser, isPremium, resetSavedStore, userId]),
  );

  const openItem = useCallback(
    (item: SavedItem) => {
      if (item.type === "country") {
        router.push({ pathname: "/country/[slug]", params: { slug: item.slug } });
        return;
      }

      router.push(`/visa/${item.documentId}`);
    },
    [router],
  );

  const removeItem = useCallback(
    (item: SavedItem) => {
      if (!userId) {
        return;
      }

      haptic.light();

      const mutation =
        item.type === "country"
          ? unsaveCountryOptimistic({ clerkUserId: userId, countryId: item.countryId })
          : unsaveDocumentOptimistic({ clerkUserId: userId, documentId: item.documentId });

      mutation.catch((error) => {
        console.warn("Unable to remove saved item", error);
        showErrorToast("Could not remove saved item", "Please try again in a moment.");
      });

      showUnsavedToast(item.type === "country" ? item.name : item.title, item.type);
    },
    [unsaveCountryOptimistic, unsaveDocumentOptimistic, userId],
  );

  const renderItem: ListRenderItem<SavedItem> = useCallback(
    ({ item, index }) => {
      const mutationKey =
        item.type === "country"
          ? `country:${item.countryId}`
          : `document:${item.documentId}`;

      return (
        <Entrance index={index} layout exit style={styles.cardWrap}>
          <SavedCard
            item={item}
            isRemoving={pendingMutations[mutationKey] === "removing"}
            onOpen={openItem}
            onRemove={removeItem}
          />
        </Entrance>
      );
    },
    [openItem, pendingMutations, removeItem],
  );

  const listHeader = (
    <View style={styles.header}>
      <Entrance from="none">
        <AppText variant="display">Saved</AppText>
        <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
          Your curated collection of European working pathways.
        </AppText>
      </Entrance>
      {savedItems.length > 0 ? (
        <Entrance from="none" delay={60} style={styles.filters}>
          <FilterBar options={filterOptions} value={filter} onChange={setFilter} />
        </Entrance>
      ) : null}
    </View>
  );

  const listEmpty = planStatus === "free" ? (
    <PaywallCard feature="save" compact />
  ) : planStatus === "unknown" || isLoading ? (
    <LoadingState label="Loading saved guides…" />
  ) : hasError ? (
    <ErrorState
      title="Saved guides are unavailable"
      message="We could not load your saved guides right now."
      action={{ label: "Try again", onPress: () => userId && void refresh(userId) }}
    />
  ) : savedItems.length === 0 ? (
    <EmptyState
      icon="bookmark"
      title="Nothing saved yet"
      message="Bookmark countries and guides to keep them here, ready for offline planning."
      action={{ label: "Explore countries", onPress: () => router.push("/") }}
    />
  ) : (
    <EmptyState
      icon={filter === "countries" ? "flag" : "document"}
      title={filter === "countries" ? "No saved countries" : "No saved guides"}
      message="Switch filters or save more items to see them here."
    />
  );

  return (
    <TabScreen>
      <Screen padded={false}>
        <Animated.FlatList
          data={visibleItems}
          keyExtractor={savedItemKey}
          renderItem={renderItem}
          itemLayoutAnimation={listLayoutTransition}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<View style={styles.empty}>{listEmpty}</View>}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
        />
      </Screen>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Layout.bottomPadding + Spacing.huge,
  },
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  subtitle: {
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  filters: {
    marginTop: Spacing.xl,
  },
  cardWrap: {
    paddingHorizontal: Layout.screenPadding,
    marginTop: Spacing.md,
  },
  empty: {
    paddingHorizontal: Layout.screenPadding,
    marginTop: Spacing.lg,
  },
});
