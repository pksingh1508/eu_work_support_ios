import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";

export function normalizeExternalUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(normalizedValue);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Opens web pages in an in-app Safari sheet (SFSafariViewController), so
 * people can check an official source and swipe back to the guide they were
 * reading. Other schemes (mailto:, tel:) go to their system app.
 */
export function openExternalUrl(url: string, label = "this link") {
  const showError = () => {
    Alert.alert("Unable to open", `Please try opening ${label} again.`);
  };

  if (/^https?:\/\//i.test(url)) {
    WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: "done",
      enableBarCollapsing: true,
    }).catch(() => {
      Linking.openURL(url).catch(showError);
    });
    return;
  }

  Linking.openURL(url).catch(showError);
}

export function openMailTo(address: string, subject: string) {
  openExternalUrl(
    `mailto:${address}?subject=${encodeURIComponent(subject)}`,
    "your email app",
  );
}
