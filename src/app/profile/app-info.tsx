import Constants from "expo-constants";
import { Platform, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Surface } from "@/components/ui/surface";
import { Spacing } from "@/constants/theme";

const version = Constants.expoConfig?.version ?? "1.0.0";
const buildNumber =
  Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? "—";

const appInfoRows = [
  { label: "Version", value: version },
  { label: "Build", value: buildNumber },
  { label: "Platform", value: `${Platform.OS === "ios" ? "iOS" : Platform.OS} ${Platform.Version}` },
  { label: "Developer", value: "EU Work Support" },
];

export default function AppInfoScreen() {
  return (
    <Screen scroll header={<ScreenHeader padded title="App info" />}>
      <Entrance index={0}>
        <Surface style={styles.hero}>
          <IconBadge icon="compass" tone="primary" size={64} radius="lg" />
          <AppText variant="title2" style={styles.name}>
            EU Work Support
          </AppText>
          <AppText variant="subhead" color="textSecondary" align="center">
            Independent guidance for working, studying and settling in Europe.
          </AppText>
        </Surface>
      </Entrance>

      <Entrance index={1} style={styles.section}>
        <ListGroup title="Details" separatorInset={Spacing.lg}>
          {appInfoRows.map((row) => (
            <ListRow key={row.label} title={row.label} value={row.value} trailing="none" />
          ))}
        </ListGroup>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  name: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  section: {
    marginTop: Spacing.xxl,
  },
});
