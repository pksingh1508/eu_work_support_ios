import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { TabScreen } from "@/components/ui/tab-screen";
import { Spacing } from "@/constants/theme";
import { PaywallCard } from "@/features/billing/paywall-card";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { SearchResultCard } from "@/features/search/search-result-card";
import {
  addRecentSearch,
  getStoredRecentSearches,
  MIN_SEARCH_LENGTH,
  normalizeQuery,
  removeRecentSearch,
  SEARCH_DEBOUNCE_MS,
  searchPublishedDocuments,
  type SearchResult,
} from "@/features/search/search-service";
import { SearchSuggestions } from "@/features/search/search-suggestions";

const SKELETON_COUNT = 3;

export function SearchScreen() {
  const router = useRouter();
  const { planStatus, isPremium, isPlanUnavailable, retryPlanCheck } = usePremiumGate();
  const inputRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(getStoredRecentSearches);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search is a Premium feature: never hit Supabase for Free members.
  const shouldSearch = isPremium && debouncedQuery.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(normalizeQuery(query));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  const runSearch = useCallback((nextQuery: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsSearching(true);
    setError(null);

    searchPublishedDocuments(nextQuery)
      .then((nextResults) => {
        if (requestIdRef.current === requestId) {
          setResults(nextResults);
        }
      })
      .catch((searchError) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        console.warn("Unable to search country documents", searchError);
        setResults([]);
        setError("Search is unavailable right now. Please try again.");
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      });
  }, []);

  useEffect(() => {
    if (!shouldSearch) {
      requestIdRef.current += 1;
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch, shouldSearch]);

  const submitSearch = useCallback(
    (nextQuery = query) => {
      const nextSearch = normalizeQuery(nextQuery);

      if (!nextSearch) {
        return;
      }

      setQuery(nextSearch);
      setDebouncedQuery(nextSearch);
      setRecentSearches((current) => addRecentSearch(current, nextSearch));
    },
    [query],
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  const openResult = useCallback(
    (result: SearchResult) => {
      submitSearch(query || result.title);
      router.push(`/visa/${result.id}`);
    },
    [query, router, submitSearch],
  );

  const removeRecent = useCallback((value: string) => {
    setRecentSearches((current) => removeRecentSearch(current, value));
  }, []);

  const showSkeleton = shouldSearch && isSearching && results.length === 0;
  const showEmpty = shouldSearch && !isSearching && !error && results.length === 0;

  return (
    <TabScreen>
      <Screen scroll contentContainerStyle={styles.content}>
        <Entrance from="none">
          <AppText variant="display">Search</AppText>
          <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
            Visas, permits, documents and guides across Europe.
          </AppText>
        </Entrance>

        {planStatus === "free" ? (
          <PaywallCard feature="search" style={styles.field} />
        ) : null}

        {isPlanUnavailable ? (
          <ErrorState
            title="Unable to check your plan"
            message="Check your connection and try again."
            action={{ label: "Try again", onPress: () => void retryPlanCheck() }}
            style={styles.field}
          />
        ) : planStatus === "unknown" ? (
          <LoadingState label="Checking your plan…" style={styles.field} />
        ) : null}

        {isPremium ? (
          <Entrance from="none" delay={60} style={styles.field}>
            <SearchField
              mode="input"
              value={query}
              onChangeText={setQuery}
              onSubmit={() => submitSearch()}
              onClear={clearSearch}
              inputRef={inputRef}
            />
          </Entrance>
        ) : null}

        {!isPremium ? null : !shouldSearch ? (
          <SearchSuggestions
            recentSearches={recentSearches}
            onSelect={submitSearch}
            onRemoveRecent={removeRecent}
          />
        ) : (
          <View style={styles.results}>
            <Entrance from="none" style={styles.resultsHeader}>
              <AppText variant="title2">Results</AppText>
              {!isSearching && results.length > 0 ? (
                <AppText variant="label" color="textTertiary">
                  {results.length} {results.length === 1 ? "guide" : "guides"}
                </AppText>
              ) : null}
            </Entrance>

            {showSkeleton
              ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                  <SkeletonCard key={`skeleton-${index}`} />
                ))
              : null}

            {error ? (
              <ErrorState
                title="Search is unavailable"
                message={error}
                action={{ label: "Try again", onPress: () => runSearch(debouncedQuery) }}
              />
            ) : null}

            {showEmpty ? (
              <EmptyState
                icon="search"
                title="No guides found"
                message="Try a country name, visa type, document or permit topic."
              />
            ) : null}

            {results.map((result, index) => (
              <Entrance key={result.id} index={index} layout exit>
                <SearchResultCard result={result} onPress={openResult} />
              </Entrance>
            ))}
          </View>
        )}
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
  field: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  results: {
    gap: Spacing.md,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
});
