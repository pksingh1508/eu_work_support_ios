import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const isSupported = Platform.OS === "ios" || Platform.OS === "android";

function run(task: () => Promise<void>) {
  if (!isSupported) {
    return;
  }

  task().catch(() => {
    // Haptics are best-effort; never surface failures to the user.
  });
}

export const haptic = {
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () =>
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  soft: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  selection: () => run(() => Haptics.selectionAsync()),
  success: () =>
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
  warning: () =>
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    ),
  error: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
} as const;

export type HapticKind = keyof typeof haptic;
