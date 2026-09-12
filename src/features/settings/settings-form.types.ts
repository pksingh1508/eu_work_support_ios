import type { ThemePreference } from "@/lib/local-storage";

export type SettingsFormProps = {
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  onOpenFaq: () => void;
  onOpenSupport: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  version: string;
};
