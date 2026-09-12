import type { Href } from "expo-router";

type AuthRoute = "/sign-in" | "/sign-up";

/**
 * Only allow in-app absolute paths as a post-auth destination, and never
 * bounce back into the auth screens themselves.
 */
export function getSafeReturnTo(value: string | string[] | undefined, fallback = "/") {
  const requested = Array.isArray(value) ? value[0] : value;

  if (
    requested &&
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.startsWith("/sign-in") &&
    !requested.startsWith("/sign-up") &&
    !requested.startsWith("/forgot-password")
  ) {
    return requested;
  }

  return fallback;
}

export function authHref(route: AuthRoute, returnTo?: string): Href {
  if (!returnTo || returnTo === "/") {
    return route as Href;
  }

  return `${route}?returnTo=${encodeURIComponent(returnTo)}` as Href;
}
