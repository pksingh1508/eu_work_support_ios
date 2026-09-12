import Toast, { type ToastAnimationConfig } from "react-native-toast-message";

import type { AppToastProps, AppToastTone } from "@/components/ui/app-toast";

type SavedToastType = "country" | "document";

export const TOAST_DURATION_MS = 2600;

const animationConfig: ToastAnimationConfig = {
  enter: { type: "spring", friction: 7, tension: 70 },
  exit: { type: "timing", duration: 200 },
};

function showToast(tone: AppToastTone, title: string, description?: string) {
  const props: AppToastProps = { tone };

  Toast.show({
    type: "app",
    text1: title,
    text2: description,
    props,
    visibilityTime: TOAST_DURATION_MS,
    animationConfig,
  });
}

export function showSavedToast(name: string, type: SavedToastType) {
  showToast("saved", type === "country" ? "Country saved" : "Guide saved", name);
}

export function showUnsavedToast(name: string, type: SavedToastType) {
  showToast("removed", type === "country" ? "Country removed" : "Guide removed", name);
}

export function showInfoToast(title: string, description?: string) {
  showToast("info", title, description);
}

export function showSuccessToast(title: string, description?: string) {
  showToast("success", title, description);
}

export function showErrorToast(title: string, description?: string) {
  showToast("error", title, description);
}

export function hideToast() {
  Toast.hide();
}
