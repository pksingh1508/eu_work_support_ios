import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { Easing } from "react-native-reanimated";

import { FontFamily } from "@/lib/fonts";

/**
 * Design tokens for "The Diplomatic Atelier" (see DESIGN.md).
 *
 * Surfaces are layered tonally instead of separated by lines:
 * background (level 0) -> surfaceLow (level 1) -> surfaceLowest (level 2, cards)
 * -> surfaceHigh (level 3, interactive / emphasised).
 */

const INK = "#131B2E";

const lightColors = {
  background: "#F6F7FC",
  surfaceLow: "#EEF1FA",
  surfaceLowest: "#FFFFFF",
  surfaceHigh: "#E3E8FA",
  surfaceHighest: "#D6DDF3",
  text: INK,
  textSecondary: "#5B6478",
  textTertiary: "#8A93A8",
  primary: "#0058BC",
  primaryContainer: "#0070EB",
  primarySoft: "#E4EEFF",
  primaryGradientStart: "#0058BC",
  primaryGradientEnd: "#0070EB",
  onPrimary: "#FFFFFF",
  tertiary: "#C15300",
  tertiarySoft: "#FFEFE3",
  success: "#1B7F4E",
  successSoft: "#E1F4E8",
  error: "#BA1A1A",
  errorSoft: "#FFEDEA",
  outline: "rgba(19, 27, 46, 0.08)",
  outlineStrong: "rgba(19, 27, 46, 0.16)",
  heroStart: "#0C1A3F",
  heroEnd: "#173672",
  onHero: "#F7F9FF",
  onHeroMuted: "rgba(247, 249, 255, 0.74)",
  heroSurface: "rgba(255, 255, 255, 0.12)",
  heroAccent: "#8FBEFF",
  headerStart: "#E2EBFF",
  headerEnd: "#F6F7FC",
  scrim: "rgba(8, 14, 28, 0.55)",
  placeholder: "#98A1B4",
  skeleton: "#E5E8F2",
  skeletonHighlight: "#F4F6FC",
  tabBarBackground: "#FFFFFF",
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };
export type ColorToken = keyof ThemeColors;

const darkColors: ThemeColors = {
  background: "#0D1220",
  surfaceLow: "#141B2D",
  surfaceLowest: "#1A2236",
  surfaceHigh: "#25304A",
  surfaceHighest: "#2F3D5C",
  text: "#F3F5FB",
  textSecondary: "#B5BED2",
  textTertiary: "#7E89A3",
  primary: "#8FBEFF",
  primaryContainer: "#4A93F1",
  primarySoft: "rgba(143, 190, 255, 0.16)",
  primaryGradientStart: "#3B86E8",
  primaryGradientEnd: "#6FAEFF",
  onPrimary: "#07111F",
  tertiary: "#FFB787",
  tertiarySoft: "rgba(255, 183, 135, 0.16)",
  success: "#7BD8A2",
  successSoft: "rgba(123, 216, 162, 0.16)",
  error: "#FFB4AB",
  errorSoft: "rgba(255, 180, 171, 0.16)",
  outline: "rgba(255, 255, 255, 0.08)",
  outlineStrong: "rgba(255, 255, 255, 0.16)",
  heroStart: "#1A2A55",
  heroEnd: "#0F1A38",
  onHero: "#F7F9FF",
  onHeroMuted: "rgba(247, 249, 255, 0.72)",
  heroSurface: "rgba(255, 255, 255, 0.10)",
  heroAccent: "#8FBEFF",
  headerStart: "#152140",
  headerEnd: "#0D1220",
  scrim: "rgba(0, 0, 0, 0.6)",
  placeholder: "#6F7A94",
  skeleton: "#1F2940",
  skeletonHighlight: "#2A3650",
  tabBarBackground: "#121A2B",
};

export const Colors = {
  light: lightColors as ThemeColors,
  dark: darkColors,
} as const;

export type ThemeName = keyof typeof Colors;

/**
 * Editorial type scale. Poppins carries display and titles, Inter carries
 * everything that needs to be read at length. Line heights follow the
 * 1.25 (headings) / 1.5 (body) rule from AGENT.md.
 */
export const Typography = {
  display: {
    fontFamily: FontFamily.headingExtraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  title1: {
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  title2: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  title3: {
    fontFamily: FontFamily.headingSemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  callout: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0,
  },
  subhead: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0,
  },
  footnote: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  button: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
  },
  buttonSmall: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof Typography;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

export const Radii = {
  flag: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 32,
  pill: 999,
} as const;

export const Shadows = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  card: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  floating: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  hero: {
    shadowColor: "#0C1A3F",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
} as const satisfies Record<string, ViewStyle>;

/**
 * Motion tokens. Every animation in the app derives from these so the UI
 * feels like one system: quick, soft and never bouncy for its own sake.
 */
export const Motion = {
  duration: {
    instant: 100,
    fast: 160,
    base: 240,
    slow: 360,
    screen: 300,
  },
  easing: {
    standard: Easing.bezierFn(0.2, 0.8, 0.2, 1),
    emphasized: Easing.bezierFn(0.22, 1, 0.36, 1),
    exit: Easing.bezierFn(0.4, 0, 1, 1),
    linear: Easing.linear,
  },
  spring: {
    snappy: { damping: 20, stiffness: 340, mass: 0.6 },
    gentle: { damping: 22, stiffness: 200, mass: 0.9 },
    bouncy: { damping: 15, stiffness: 260, mass: 0.8 },
  },
  stagger: {
    step: 45,
    maxIndex: 8,
  },
} as const;

export const Layout = {
  screenPadding: 20,
  contentMaxWidth: 640,
  bottomPadding: Platform.select({ ios: 32, default: 24 }) ?? 24,
  headerButtonSize: 44,
  hitSlop: 10,
} as const;
