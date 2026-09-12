import { Appearance } from "react-native";
import { create } from "zustand";

import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/local-storage";

type ThemeStore = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

/**
 * Applies the stored preference to the native appearance so that every
 * `useColorScheme()` consumer (React Native, navigation, native views)
 * follows the user's choice instead of the OS setting.
 */
function applyPreference(preference: ThemePreference) {
  if (typeof Appearance.setColorScheme !== "function") {
    return;
  }

  Appearance.setColorScheme(preference === "system" ? null : preference);
}

export const useThemeStore = create<ThemeStore>((set) => {
  const initialPreference = getThemePreference();
  applyPreference(initialPreference);

  return {
    preference: initialPreference,
    setPreference: (preference) => {
      setThemePreference(preference);
      applyPreference(preference);
      set({ preference });
    },
  };
});

export const themePreferenceOptions: Array<{
  key: ThemePreference;
  label: string;
}> = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];
