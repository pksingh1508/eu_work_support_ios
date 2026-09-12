import { ScrollView, StyleSheet, View } from "react-native";

import { FilterBar } from "@/components/ui/filter-bar";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { NativeToggle } from "@/components/ui/native-toggle";
import { Layout, Spacing } from "@/constants/theme";
import type { SettingsFormProps } from "@/features/settings/settings-form.types";
import { themePreferenceOptions } from "@/features/theme/theme-store";

/**
 * Settings list for Android and web. iOS renders a native SwiftUI Form
 * (see `settings-form.ios.tsx`).
 */
export function SettingsForm({
  preference,
  onPreferenceChange,
  notificationsEnabled,
  onNotificationsChange,
  onOpenFaq,
  onOpenSupport,
  onOpenPrivacy,
  onOpenTerms,
  version,
}: SettingsFormProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ListGroup title="Appearance" footer="Follow the system setting or pick a theme.">
        <View style={styles.row}>
          <FilterBar
            options={themePreferenceOptions}
            value={preference}
            onChange={onPreferenceChange}
          />
        </View>
      </ListGroup>

      <ListGroup
        title="Notifications"
        footer="Get notified when a saved guide is updated."
        style={styles.group}
      >
        <View style={styles.row}>
          <NativeToggle
            value={notificationsEnabled}
            onValueChange={onNotificationsChange}
            label="Guide updates"
          />
        </View>
      </ListGroup>

      <ListGroup title="Help" style={styles.group}>
        <ListRow icon="help" title="FAQ" onPress={onOpenFaq} />
        <ListRow icon="mail" title="Contact support" onPress={onOpenSupport} />
      </ListGroup>

      <ListGroup title="Legal" style={styles.group}>
        <ListRow icon="lockShield" title="Privacy policy" onPress={onOpenPrivacy} />
        <ListRow icon="legal" title="Terms and conditions" onPress={onOpenTerms} />
      </ListGroup>

      <ListGroup title="About" style={styles.group} separatorInset={Spacing.lg}>
        <ListRow title="Version" value={version} trailing="none" />
      </ListGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.bottomPadding + Spacing.lg,
  },
  group: {
    marginTop: Spacing.xxl,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
