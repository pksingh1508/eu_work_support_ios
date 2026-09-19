import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Entrance } from "@/components/ui/entrance";
import { FilterBar } from "@/components/ui/filter-bar";
import { TabScreen } from "@/components/ui/tab-screen";
import {
  countryDetails,
  getCountrySlug,
  popularDestinationImages,
  type CountryName,
} from "@/constants/country";
import { Layout, Motion, Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { CountryCard } from "@/features/home/country-card";
import {
  getCountriesForFilter,
  homeFilterOptions,
  type HomeFilterKey,
} from "@/features/home/home-filters";
import { HomeHero } from "@/features/home/home-hero";
import { PopularDestinations } from "@/features/home/popular-destinations";
import { useCountrySave } from "@/features/home/use-country-save";
import { useSavedStore } from "@/features/saved/saved-store";
import { useTheme } from "@/hooks/use-theme";

type HomeListItem =
  | { type: "hero" }
  | { type: "popular" }
  | { type: "filters" }
  | { type: "country"; country: CountryName; index: number; filter: HomeFilterKey };

const STICKY_FILTER_INDEX = 2;
const FILTER_DOCK_FADE_DISTANCE = 24;

export function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthLoaded, savedItemsOwnerId, hasPremiumAccess, planStatus, profile } =
    useAuthAccess();
  const hydrateSavedForUser = useSavedStore((state) => state.hydrateForUser);
  const resetSavedStore = useSavedStore((state) => state.reset);
  const { canSave, toggleSave, isSaved, isSaving } = useCountrySave();
  const [activeFilter, setActiveFilter] = useState<HomeFilterKey>("all");

  const scrollY = useSharedValue(0);
  const heroHeight = useSharedValue(0);
  const popularHeight = useSharedValue(0);

  useEffect(() => {
    void Image.prefetch(Object.values(popularDestinationImages), {
      cachePolicy: "memory-disk",
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthLoaded) {
        return;
      }

      if (!hasPremiumAccess || !savedItemsOwnerId) {
        // Keep the cache while the plan is still being checked.
        if (planStatus === "free") {
          resetSavedStore();
        }
        return;
      }

      void hydrateSavedForUser(savedItemsOwnerId);
    }, [
      hasPremiumAccess,
      hydrateSavedForUser,
      isAuthLoaded,
      planStatus,
      resetSavedStore,
      savedItemsOwnerId,
    ]),
  );

  const listData = useMemo<HomeListItem[]>(
    () => [
      { type: "hero" },
      { type: "popular" },
      { type: "filters" },
      ...getCountriesForFilter(activeFilter).map((country, index) => ({
        type: "country" as const,
        country,
        index,
        filter: activeFilter,
      })),
    ],
    [activeFilter],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const statusBarStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        scrollY.value,
        [0, Math.max(heroHeight.value * 0.6, 1)],
        [colors.headerStart, colors.background],
      ),
    }),
    [colors],
  );

  const dockStyle = useAnimatedStyle(() => {
    const dockOffset = heroHeight.value + popularHeight.value;

    if (dockOffset <= 0) {
      return { opacity: 0 };
    }

    return {
      opacity: interpolate(
        scrollY.value,
        [dockOffset - FILTER_DOCK_FADE_DISTANCE, dockOffset],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  const openCountry = useCallback(
    (country: CountryName) => {
      router.push(`/country/${getCountrySlug(country)}`);
    },
    [router],
  );

  const openSearch = useCallback(() => {
    router.push("/search");
  }, [router]);

  const setHeroHeight = useCallback(
    (height: number) => {
      heroHeight.value = height;
    },
    [heroHeight],
  );

  const setPopularHeight = useCallback(
    (height: number) => {
      popularHeight.value = height;
    },
    [popularHeight],
  );

  const renderItem: ListRenderItem<HomeListItem> = useCallback(
    ({ item }) => {
      switch (item.type) {
        case "hero":
          return (
            <HomeHero
              greetingName={profile?.firstName ?? null}
              onSearchPress={openSearch}
              onLayout={setHeroHeight}
            />
          );
        case "popular":
          return (
            <PopularDestinations
              onPressCountry={openCountry}
              onLayout={setPopularHeight}
            />
          );
        case "filters":
          return (
            <HomeFilterBar
              value={activeFilter}
              onChange={setActiveFilter}
              dockStyle={dockStyle}
            />
          );
        case "country": {
          const slug = getCountrySlug(item.country);
          const details = countryDetails[item.country];
          const card = (
            <CountryCard
              country={item.country}
              code={details.code}
              summary={details.summary}
              demand={details.demand}
              canSave={canSave}
              isSaved={isSaved(slug)}
              isSaving={isSaving(slug)}
              onPress={openCountry}
              onToggleSave={toggleSave}
            />
          );

          return (
            <View style={styles.cardWrap}>
              {item.index < Motion.stagger.maxIndex ? (
                <Entrance index={item.index}>{card}</Entrance>
              ) : (
                card
              )}
            </View>
          );
        }
        default:
          return null;
      }
    },
    [
      activeFilter,
      canSave,
      dockStyle,
      isSaved,
      isSaving,
      openCountry,
      openSearch,
      profile?.firstName,
      setHeroHeight,
      setPopularHeight,
      toggleSave,
    ],
  );

  return (
    <TabScreen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.statusBar, { height: insets.top }, statusBarStyle]}
        />
        <SafeAreaView edges={["top"]} style={styles.container}>
          <Animated.FlatList
            data={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            stickyHeaderIndices={[STICKY_FILTER_INDEX]}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={6}
            windowSize={7}
            removeClippedSubviews
          />
        </SafeAreaView>
      </View>
    </TabScreen>
  );
}

/**
 * Country keys include the active filter so switching filters remounts the
 * rows and replays the staggered entrance.
 */
function keyExtractor(item: HomeListItem) {
  return item.type === "country"
    ? `country-${item.filter}-${item.country}`
    : item.type;
}

type HomeFilterBarProps = {
  value: HomeFilterKey;
  onChange: (value: HomeFilterKey) => void;
  dockStyle: StyleProp<AnimatedStyle<ViewStyle>>;
};

function HomeFilterBar({ value, onChange, dockStyle }: HomeFilterBarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.filters}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outline,
          },
          dockStyle,
        ]}
      />
      <FilterBar options={homeFilterOptions} value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  listContent: {
    paddingBottom: Layout.bottomPadding + Spacing.huge,
  },
  filters: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.sm + Spacing.xxs,
  },
  cardWrap: {
    paddingHorizontal: Layout.screenPadding,
    marginTop: Spacing.md,
  },
});
