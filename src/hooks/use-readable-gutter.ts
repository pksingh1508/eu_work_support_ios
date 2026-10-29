import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Layout } from "@/constants/theme";

export type ReadableGutter = {
  /** Horizontal padding for the leading edge, including the screen padding. */
  left: number;
  /** Horizontal padding for the trailing edge, including the screen padding. */
  right: number;
};

/**
 * Side padding for full-bleed content (gradients, carousels, sticky bars) that
 * keeps its contents clear of the side safe areas (iPhone Duo's tab rail and
 * status bar sit on the right) and lines them up with `ReadableColumn` on wide
 * windows. On phones this is just the screen padding.
 */
export function useReadableGutter(): ReadableGutter {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = width - insets.left - insets.right;
  const centring = Math.max(0, Math.round((available - Layout.readableMaxWidth) / 2));

  return {
    left: Layout.screenPadding + insets.left + centring,
    right: Layout.screenPadding + insets.right + centring,
  };
}
