import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { FontFamily } from "@/lib/fonts";

const hasLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

/**
 * Native bottom tabs (UITabBarController on iOS). On iOS 26 the bar is
 * Liquid Glass, minimises while scrolling and exposes the system search
 * tab; older systems get a chrome-material blur.
 */
export default function AppTabs() {
  const { colors, isDark } = useTheme();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={colors.primary}
      iconColor={{ default: colors.textTertiary, selected: colors.primary }}
      labelStyle={{
        default: {
          fontFamily: FontFamily.bodyMedium,
          fontSize: 11,
          color: colors.textTertiary,
        },
        selected: {
          fontFamily: FontFamily.bodySemiBold,
          fontSize: 11,
          color: colors.primary,
        },
      }}
      badgeBackgroundColor={colors.tertiary}
      backgroundColor={hasLiquidGlass ? undefined : colors.tabBarBackground}
      blurEffect={
        hasLiquidGlass
          ? undefined
          : isDark
            ? "systemChromeMaterialDark"
            : "systemChromeMaterialLight"
      }
      rippleColor={colors.primarySoft}
      indicatorColor={colors.primarySoft}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          md="home"
          sf={{ default: "house", selected: "house.fill" }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon md="search" sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon
          md="bookmark"
          sf={{ default: "bookmark", selected: "bookmark.fill" }}
        />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="billing">
        <NativeTabs.Trigger.Icon
          md="workspace_premium"
          sf={{ default: "crown", selected: "crown.fill" }}
        />
        <NativeTabs.Trigger.Label>Billing</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          md="person"
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
