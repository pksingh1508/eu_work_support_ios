import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { CountryFlag } from "@/components/ui/country-flag";
import { Entrance } from "@/components/ui/entrance";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  countryDetails,
  popularDestinationImages,
  popularDestinationTaglines,
  popularDestinations,
  type CountryName,
  type PopularDestination,
} from "@/constants/country";
import { Layout, Radii, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 224;

type PopularDestinationsProps = {
  onPressCountry: (country: CountryName) => void;
  onLayout: (height: number) => void;
};

export function PopularDestinations({ onPressCountry, onLayout }: PopularDestinationsProps) {
  return (
    <View
      onLayout={(event: LayoutChangeEvent) => onLayout(event.nativeEvent.layout.height)}
      style={styles.section}
    >
      <SectionHeading
        title="Popular destinations"
        eyebrow="Editor's picks"
        style={styles.heading}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + Spacing.lg}
        snapToAlignment="start"
        contentContainerStyle={styles.scroll}
      >
        {popularDestinations.map((country, index) => (
          <Entrance key={country} index={index} from="none">
            <PopularDestinationCard country={country} onPress={onPressCountry} />
          </Entrance>
        ))}
      </ScrollView>
    </View>
  );
}

type PopularDestinationCardProps = {
  country: PopularDestination;
  onPress: (country: CountryName) => void;
};

const PopularDestinationCard = memo(function PopularDestinationCard({
  country,
  onPress,
}: PopularDestinationCardProps) {
  const { colors } = useTheme();
  const details = countryDetails[country];

  return (
    <PressableScale
      onPress={() => onPress(country)}
      scaleTo={0.975}
      pressedOpacity={0.95}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`Explore ${country}`}
      style={[styles.card, Shadows.hero, { backgroundColor: colors.heroStart }]}
    >
      <Image
        source={{ uri: popularDestinationImages[country] }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
        cachePolicy="memory-disk"
        recyclingKey={country}
        priority="high"
        accessibilityLabel={`${country} skyline`}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(5, 12, 25, 0)", "rgba(5, 12, 25, 0.35)", "rgba(5, 12, 25, 0.88)"]}
        locations={[0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardTop}>
        <CountryFlag code={details.code} size="sm" />
        <Chip label={details.demand} tone="inverse" uppercase />
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.cardTexts}>
          <AppText variant="title1" color="onHero" numberOfLines={1}>
            {country}
          </AppText>
          <AppText variant="subhead" color="onHeroMuted" numberOfLines={1}>
            {popularDestinationTaglines[country]}
          </AppText>
        </View>
        <GlassSurface style={styles.arrow}>
          <Icon name="arrowRight" size={18} color={colors.onHero} weight="bold" />
        </GlassSurface>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  heading: {
    paddingHorizontal: Layout.screenPadding,
  },
  scroll: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Radii.xxl,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  cardTexts: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
