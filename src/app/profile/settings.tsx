import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { PremiumGuard } from "@/features/auth/components/premium-guard";
import { SettingsForm } from "@/features/settings/settings-form";
import { useThemeStore } from "@/features/theme/theme-store";
import {
  getNotificationsPreference,
  setNotificationsPreference,
} from "@/lib/local-storage";

export default function ProfileSettingsScreen() {
  return (
    <PremiumGuard>
      <ProfileSettingsContent />
    </PremiumGuard>
  );
}

function ProfileSettingsContent() {
  const router = useRouter();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    getNotificationsPreference,
  );

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    setNotificationsPreference(enabled);
  };

  return (
    <Screen padded={false} header={<ScreenHeader padded title="Settings" />}>
      <SettingsForm
        preference={preference}
        onPreferenceChange={setPreference}
        notificationsEnabled={notificationsEnabled}
        onNotificationsChange={handleNotificationsChange}
        onOpenFaq={() => router.push("/profile/faq")}
        onOpenSupport={() => router.push("/profile/support")}
        onOpenPrivacy={() => router.push("/profile/legal/privacy-policy")}
        onOpenTerms={() => router.push("/profile/legal/terms-and-conditions")}
        version={Constants.expoConfig?.version ?? "1.0.0"}
      />
    </Screen>
  );
}
