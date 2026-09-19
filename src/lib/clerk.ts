import { tokenCache as secureTokenCache } from "@clerk/expo/token-cache";

import { env } from "@/lib/env";

type TokenCache = NonNullable<typeof secureTokenCache>;

export const clerkPublishableKey = env.clerkPublishableKey;

const memoryCache = new Map<string, string>();
let hasWarnedAboutKeychain = false;

function warnKeychainUnavailable(error: unknown) {
  if (hasWarnedAboutKeychain) {
    return;
  }

  hasWarnedAboutKeychain = true;
  console.warn(
    "Keychain is unavailable, so the Clerk session will not persist across app restarts. " +
      "On iOS this usually means the build is missing the keychain-access-groups entitlement: " +
      "run `expo prebuild --platform ios`, then rebuild and reinstall with code signing enabled.",
    error,
  );
}

/**
 * Clerk token cache backed by expo-secure-store with an in-memory fallback.
 *
 * A build without Keychain entitlements (for example one compiled with
 * `CODE_SIGNING_ALLOWED=NO`) makes every SecureStore call throw. Without the
 * fallback that rejection stops Clerk from ever reporting `isLoaded`, and the
 * login screen dead-ends. With it, login still works for the current launch.
 */
function withMemoryFallback(secure: TokenCache): TokenCache {
  return {
    getToken: async (key) => {
      try {
        const token = await secure.getToken(key);

        if (token != null) {
          return token;
        }
      } catch (error) {
        warnKeychainUnavailable(error);
      }

      return memoryCache.get(key) ?? null;
    },
    saveToken: async (key, token) => {
      memoryCache.set(key, token);

      try {
        await secure.saveToken(key, token);
      } catch (error) {
        warnKeychainUnavailable(error);
      }
    },
    clearToken: (key) => {
      memoryCache.delete(key);
      secure.clearToken?.(key);
    },
  };
}

export const clerkTokenCache: TokenCache | undefined = secureTokenCache
  ? withMemoryFallback(secureTokenCache)
  : undefined;
