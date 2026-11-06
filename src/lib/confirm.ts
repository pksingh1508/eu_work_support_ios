import { ActionSheetIOS, Alert, Platform } from "react-native";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
};

/**
 * Confirms a destructive action the iOS way: an action sheet rising from the
 * bottom, with the destructive option in red and Cancel separated below.
 * Other platforms get an alert.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: [confirmLabel, cancelLabel],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (index) => resolve(index === 0),
      );
      return;
    }

    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
