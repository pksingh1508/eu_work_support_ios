import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SettingsForm } from "@/features/settings/settings-form";
import { useThemeStore } from "@/features/theme/theme-store";

// Appearance, help and legal: nothing here needs an account.
export default function ProfileSettingsScreen() {
  const router = useRouter();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <Screen padded={false} header={<ScreenHeader padded title="Settings" />}>
      <SettingsForm
        preference={preference}
        onPreferenceChange={setPreference}
        onOpenFaq={() => router.push("/profile/faq")}
        onOpenSupport={() => router.push("/profile/support")}
        onOpenPrivacy={() => router.push("/profile/legal/privacy-policy")}
        onOpenTerms={() => router.push("/profile/legal/terms-and-conditions")}
        version={Constants.expoConfig?.version ?? "1.0.0"}
      />
    </Screen>
  );
}
