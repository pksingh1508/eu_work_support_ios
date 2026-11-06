import { ContentUnavailableView, Host } from "@expo/ui/swift-ui";
import { StyleSheet, useWindowDimensions } from "react-native";

import { iconMap } from "@/components/ui/icon-names";
import type { NativeUnavailableProps } from "@/components/ui/native-unavailable.types";
import { useTheme } from "@/hooks/use-theme";

/**
 * The system empty / error state (SwiftUI ContentUnavailableView): the same
 * symbol, type and spacing as Mail, Notes or Files when there is nothing to show.
 */
export function NativeUnavailable({ icon, title, message }: NativeUnavailableProps) {
  const { scheme } = useTheme();
  const { fontScale } = useWindowDimensions();
  // ContentUnavailableView fills the space it is given and centres itself, so
  // it needs a height; grow it with Dynamic Type so text never clips.
  const height = Math.round((message ? 215 : 165) * Math.min(Math.max(fontScale, 1), 2.4));

  return (
    <Host colorScheme={scheme} style={[styles.host, { height }]}>
      <ContentUnavailableView title={title} systemImage={iconMap[icon].sf} description={message} />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
