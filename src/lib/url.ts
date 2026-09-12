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

export function openExternalUrl(url: string, label = "this link") {
  Linking.openURL(url).catch(() => {
    Alert.alert("Unable to open", `Please try opening ${label} again.`);
  });
}

export function openMailTo(address: string, subject: string) {
  openExternalUrl(
    `mailto:${address}?subject=${encodeURIComponent(subject)}`,
    "your email app",
  );
}
