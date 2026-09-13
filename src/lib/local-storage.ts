import { createMMKV } from 'react-native-mmkv';

type StorageValue = boolean | string | number | ArrayBuffer;

type LocalStorage = {
  set: (key: string, value: StorageValue) => void;
  getBoolean: (key: string) => boolean | undefined;
  getString: (key: string) => string | undefined;
  getNumber: (key: string) => number | undefined;
  remove: (key: string) => boolean;
};

export type ThemePreference = 'system' | 'light' | 'dark';

export type CachedAuthSnapshot = {
  lastSignedIn: boolean;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  userPlan: string | null;
  cachedAt: number | null;
};

export const localStorageKeys = {
  authLastSignedIn: 'auth.lastSignedIn',
  authLastUserId: 'auth.lastUserId',
  authEmail: 'auth.email',
  authFirstName: 'auth.firstName',
  authLastName: 'auth.lastName',
  authImageUrl: 'auth.imageUrl',
  authUserPlan: 'auth.userPlan',
  authCachedAt: 'auth.cachedAt',
  savedItemsSnapshot: 'saved.itemsSnapshot',
  themePreference: 'settings.themePreference',
} as const;

const memoryStore = new Map<string, StorageValue>();

function createMemoryStorage(): LocalStorage {
  return {
    set: (key, value) => {
      memoryStore.set(key, value);
    },
    getBoolean: (key) => {
      const value = memoryStore.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    getString: (key) => {
      const value = memoryStore.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key) => {
      const value = memoryStore.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    remove: (key) => memoryStore.delete(key),
  };
}

function createAppStorage(): LocalStorage {
  try {
    return createMMKV({ id: 'eu-work-support.app' });
  } catch (error) {
    console.warn('MMKV is unavailable, falling back to in-memory storage.', error);
    return createMemoryStorage();
  }
}

export const appStorage = createAppStorage();

export function getCachedAuthSnapshot(): CachedAuthSnapshot {
  return {
    lastSignedIn: appStorage.getBoolean(localStorageKeys.authLastSignedIn) ?? false,
    userId: appStorage.getString(localStorageKeys.authLastUserId) ?? null,
    email: appStorage.getString(localStorageKeys.authEmail) ?? null,
    firstName: appStorage.getString(localStorageKeys.authFirstName) ?? null,
    lastName: appStorage.getString(localStorageKeys.authLastName) ?? null,
    imageUrl: appStorage.getString(localStorageKeys.authImageUrl) ?? null,
    userPlan: appStorage.getString(localStorageKeys.authUserPlan) ?? null,
    cachedAt: appStorage.getNumber(localStorageKeys.authCachedAt) ?? null,
  };
}

function setOptionalString(key: string, value: string | null) {
  if (value) {
    appStorage.set(key, value);
    return;
  }

  appStorage.remove(key);
}

export function setCachedAuthSnapshot(snapshot: CachedAuthSnapshot) {
  appStorage.set(localStorageKeys.authLastSignedIn, snapshot.lastSignedIn);

  setOptionalString(localStorageKeys.authLastUserId, snapshot.userId);
  setOptionalString(localStorageKeys.authEmail, snapshot.email);
  setOptionalString(localStorageKeys.authFirstName, snapshot.firstName);
  setOptionalString(localStorageKeys.authLastName, snapshot.lastName);
  setOptionalString(localStorageKeys.authImageUrl, snapshot.imageUrl);
  setOptionalString(localStorageKeys.authUserPlan, snapshot.userPlan);

  if (typeof snapshot.cachedAt === 'number') {
    appStorage.set(localStorageKeys.authCachedAt, snapshot.cachedAt);
  } else {
    appStorage.remove(localStorageKeys.authCachedAt);
  }
}

export function clearCachedAuthSnapshot() {
  setCachedAuthSnapshot({
    lastSignedIn: false,
    userId: null,
    email: null,
    firstName: null,
    lastName: null,
    imageUrl: null,
    userPlan: null,
    cachedAt: null,
  });
}

export function getThemePreference(): ThemePreference {
  const value = appStorage.getString(localStorageKeys.themePreference);

  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  appStorage.set(localStorageKeys.themePreference, 'system');
  return 'system';
}

export function setThemePreference(preference: ThemePreference) {
  appStorage.set(localStorageKeys.themePreference, preference);
}
