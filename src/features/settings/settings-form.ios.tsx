import {
  Button,
  Form,
  Host,
  LabeledContent,
  Picker,
  Section,
  Text,
} from "@expo/ui/swift-ui";
import { pickerStyle, scrollContentBackground, tag } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import type { SettingsFormProps } from "@/features/settings/settings-form.types";
import { themePreferenceOptions } from "@/features/theme/theme-store";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/lib/haptics";
import type { ThemePreference } from "@/lib/local-storage";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Native SwiftUI settings form: segmented theme picker and grouped rows,
 * hosted inside the app's screen chrome.
 */
export function SettingsForm({
  preference,
  onPreferenceChange,
  onOpenFaq,
  onOpenSupport,
  onOpenPrivacy,
  onOpenTerms,
  version,
}: SettingsFormProps) {
  const { scheme } = useTheme();

  return (
    <Host style={styles.host} colorScheme={scheme}>
      <Form modifiers={[scrollContentBackground("hidden")]}>
        <Section
          title="Appearance"
          footer={<Text>Follow the system setting or pick a theme.</Text>}
        >
          <Picker<string>
            label="Theme"
            selection={preference}
            onSelectionChange={(selection) => {
              if (isThemePreference(selection) && selection !== preference) {
                haptic.selection();
                onPreferenceChange(selection);
              }
            }}
            modifiers={[pickerStyle("segmented")]}
          >
            {themePreferenceOptions.map((option) => (
              <Text key={option.key} modifiers={[tag(option.key)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Section>

        <Section title="Help">
          <Button label="FAQ" systemImage="questionmark.circle" onPress={onOpenFaq} />
          <Button label="Contact support" systemImage="envelope" onPress={onOpenSupport} />
        </Section>

        <Section title="Legal">
          <Button label="Privacy policy" systemImage="hand.raised" onPress={onOpenPrivacy} />
          <Button label="Terms and conditions" systemImage="doc.text" onPress={onOpenTerms} />
        </Section>

        <Section title="About">
          <LabeledContent label="Version">
            <Text>{version}</Text>
          </LabeledContent>
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
