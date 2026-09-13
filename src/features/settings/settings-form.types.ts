import type { ThemePreference } from "@/lib/local-storage";

export type SettingsFormProps = {
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  onOpenFaq: () => void;
  onOpenSupport: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  version: string;
};
