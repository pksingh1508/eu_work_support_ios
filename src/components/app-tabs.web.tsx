import {
  TabList,
  TabListProps,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from "expo-router/ui";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Layout, Radii, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <WebTabList>
          <TabTrigger name="home" href="/" asChild>
            <WebTabButton>Home</WebTabButton>
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <WebTabButton>Search</WebTabButton>
          </TabTrigger>
          <TabTrigger name="saved" href="/saved" asChild>
            <WebTabButton>Saved</WebTabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <WebTabButton>Profile</WebTabButton>
          </TabTrigger>
        </WebTabList>
      </TabList>
    </Tabs>
  );
}

function WebTabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const { colors } = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <View
        style={[
          styles.tabButton,
          { backgroundColor: isFocused ? colors.surfaceHigh : "transparent" },
        ]}
      >
        <AppText variant="label" color={isFocused ? "primary" : "textSecondary"}>
          {children}
        </AppText>
      </View>
    </Pressable>
  );
}

function WebTabList(props: TabListProps) {
  const { colors } = useTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: colors.surfaceLowest }]}>
        <AppText variant="label" style={styles.brandText}>
          EU Work Support
        </AppText>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: "100%",
  },
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.pill,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.sm,
    maxWidth: Layout.contentMaxWidth,
  },
  brandText: {
    marginRight: "auto",
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
  },
});
