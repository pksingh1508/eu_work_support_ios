import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { SearchField } from "@/components/ui/search-field";
import { Layout, Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type HomeHeroProps = {
  greetingName?: string | null;
  onSearchPress: () => void;
  onLayout: (height: number) => void;
};

/**
 * Welcome block at the top of Home: soft gradient, editorial title and the
 * search shortcut.
 */
export function HomeHero({ greetingName, onSearchPress, onLayout }: HomeHeroProps) {
  const { colors } = useTheme();
  const title = greetingName ? `Welcome back, ${greetingName}` : "Welcome";

  return (
    <View onLayout={(event: LayoutChangeEvent) => onLayout(event.nativeEvent.layout.height)}>
      <LinearGradient
        colors={[colors.headerStart, colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <View
          pointerEvents="none"
          style={[styles.orb, { backgroundColor: colors.primarySoft }]}
        />
        <Entrance from="none">
          <AppText variant="eyebrow" color="primary">
            EU Work Support
          </AppText>
          <AppText variant="display" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
            Your journey to working in Europe begins here.
          </AppText>
        </Entrance>
        <Entrance delay={80} style={styles.search}>
          <SearchField mode="button" onPress={onSearchPress} />
        </Entrance>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: Radii.pill,
    top: -120,
    right: -70,
    opacity: 0.7,
  },
  title: {
    marginTop: Spacing.sm,
  },
  subtitle: {
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  search: {
    marginTop: Spacing.xxl,
  },
});
