import { useMemo } from "react";

import { Colors, type ThemeColors, type ThemeName } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type Theme = {
  colors: ThemeColors;
  scheme: ThemeName;
  isDark: boolean;
};

/**
 * Resolves the active colour set. The scheme comes from React Native's
 * appearance, which the theme store overrides when the user picks a
 * preference in Settings.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return useMemo(
    () => ({
      colors: isDark ? Colors.dark : Colors.light,
      scheme: isDark ? "dark" : "light",
      isDark,
    }),
    [isDark],
  );
}
