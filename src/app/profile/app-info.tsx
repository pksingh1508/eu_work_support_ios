import Constants from "expo-constants";
import { Platform } from "react-native";

import { NativeList } from "@/components/ui/native-list";
import { Screen } from "@/components/ui/screen";

const version = Constants.expoConfig?.version ?? "1.0.0";
const buildNumber =
  Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? "—";

const appInfoRows = [
  { key: "version", title: "Version", value: version },
  { key: "build", title: "Build", value: buildNumber },
  {
    key: "platform",
    title: "Platform",
    value: `${Platform.OS === "ios" ? "iOS" : Platform.OS} ${Platform.Version}`,
  },
  { key: "developer", title: "Developer", value: "EU Work Support" },
];

export default function AppInfoScreen() {
  return (
    <Screen nativeHeader padded={false} edges={[]}>
      <NativeList
        sections={[
          {
            key: "details",
            title: "EU Work Support",
            footer: "Independent guidance for working, studying and settling in Europe.",
            rows: appInfoRows,
          },
        ]}
      />
    </Screen>
  );
}
