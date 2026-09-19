import { useMemo } from "react";
import { create } from "zustand";

import { GUEST_OWNER_ID } from "@/features/auth/access";
import {
  fetchSavedItems,
  SavedCountry,
  SavedDocument,
  setCountrySaved,
  setDocumentSaved,
} from "@/lib/saved-items";
import { appStorage, localStorageKeys } from "@/lib/local-storage";
import { withTimeout } from "@/lib/with-timeout";

export type SavedStoreStatus = "idle" | "loading" | "ready" | "error";
export type SavedMutationStatus = "saving" | "removing";

export const savedItemsFreshnessTtlMs = 3 * 60 * 1000;

/**
 * Saved items belong to an owner: a member's Clerk user id (stored in
 * Supabase, cached on the device) or `GUEST_OWNER_ID` (stored only on this
 * device, under its own key so signing in and out never wipes them). When a
 * guest later signs in, their device saves are copied into the account.
 */
export type SaveCountryPayload = {
  ownerId: string;
  countryId: string;
  country?: SavedCountry;
};

export type UnsaveCountryPayload = {
  ownerId: string;
  countryId: string;
};

export type SaveDocumentPayload = {
  ownerId: string;
  documentId: string;
  document?: SavedDocument;
};

export type UnsaveDocumentPayload = {
  ownerId: string;
  documentId: string;
};

type PersistedSavedSnapshot = {
  userId: string;
  countryIds: string[];
  documentIds: string[];
  countries: SavedCountry[];
  documents: SavedDocument[];
  lastFetchedAt: number | null;
};

export type SavedStoreState = {
  userId: string | null;
  countryIds: Set<string>;
  documentIds: Set<string>;
  countries: SavedCountry[];
  documents: SavedDocument[];
  status: SavedStoreStatus;
  lastFetchedAt: number | null;
  pendingMutations: Record<string, SavedMutationStatus>;
  hydrateForUser: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  saveCountryOptimistic: (payload: SaveCountryPayload) => Promise<void>;
  unsaveCountryOptimistic: (payload: UnsaveCountryPayload) => Promise<void>;
  saveDocumentOptimistic: (payload: SaveDocumentPayload) => Promise<void>;
  unsaveDocumentOptimistic: (payload: UnsaveDocumentPayload) => Promise<void>;
  reset: () => void;
  /** Empties the in-memory list only; nothing stored on the device changes. */
  clearInMemory: () => void;
};

const initialState = {
  userId: null,
  countryIds: new Set<string>(),
  documentIds: new Set<string>(),
  countries: [],
  documents: [],
  status: "idle" as const,
  lastFetchedAt: null,
  pendingMutations: {},
};

let activeRefreshUserId: string | null = null;
let activeRefreshPromise: Promise<void> | null = null;
let guestMergePromise: Promise<boolean> | null = null;
/** Members whose device-save copy failed this launch; retried next launch. */
const failedGuestMergeUserIds = new Set<string>();

function isGuestOwner(ownerId: string | null) {
  return ownerId === GUEST_OWNER_ID;
}

function snapshotKeyFor(ownerId: string | null) {
  return isGuestOwner(ownerId)
    ? localStorageKeys.guestSavedItems
    : localStorageKeys.savedItemsSnapshot;
}

function countryIdsFrom(countries: SavedCountry[]) {
  return new Set(countries.map((country) => country.countryId));
}

function documentIdsFrom(documents: SavedDocument[]) {
  return new Set(documents.map((document) => document.documentId));
}

function mutationKey(type: "country" | "document", id: string) {
  return `${type}:${id}`;
}

function isFresh(lastFetchedAt: number | null) {
  return Boolean(
    lastFetchedAt && Date.now() - lastFetchedAt < savedItemsFreshnessTtlMs,
  );
}

function readPersistedSnapshot(ownerId: string | null = null) {
  const key = snapshotKeyFor(ownerId);
  const rawSnapshot = appStorage.getString(key);

  if (!rawSnapshot) {
    return null;
  }

  try {
    const snapshot = JSON.parse(rawSnapshot) as Partial<PersistedSavedSnapshot>;

    if (!snapshot.userId) {
      return null;
    }

    return {
      userId: snapshot.userId,
      countryIds: Array.isArray(snapshot.countryIds)
        ? snapshot.countryIds.filter((id): id is string => typeof id === "string")
        : [],
      documentIds: Array.isArray(snapshot.documentIds)
        ? snapshot.documentIds.filter((id): id is string => typeof id === "string")
        : [],
      countries: Array.isArray(snapshot.countries)
        ? (snapshot.countries.filter(Boolean) as SavedCountry[])
        : [],
      documents: Array.isArray(snapshot.documents)
        ? (snapshot.documents.filter(Boolean) as SavedDocument[])
        : [],
      lastFetchedAt:
        typeof snapshot.lastFetchedAt === "number" ? snapshot.lastFetchedAt : null,
    };
  } catch (error) {
    console.warn("Unable to read saved items cache", error);
    appStorage.remove(key);
    return null;
  }
}

function writePersistedSnapshot({
  userId,
  countryIds,
  documentIds,
  countries,
  documents,
  lastFetchedAt,
}: {
  userId: string | null;
  countryIds: Set<string>;
  documentIds: Set<string>;
  countries: SavedCountry[];
  documents: SavedDocument[];
  lastFetchedAt: number | null;
}) {
  if (!userId) {
    appStorage.remove(localStorageKeys.savedItemsSnapshot);
    return;
  }

  const snapshot: PersistedSavedSnapshot = {
    userId,
    countryIds: Array.from(countryIds),
    documentIds: Array.from(documentIds),
    countries,
    documents,
    lastFetchedAt,
  };

  appStorage.set(snapshotKeyFor(userId), JSON.stringify(snapshot));
}

/** Per-request cap, so a bad network cannot keep the Saved tab loading. */
const GUEST_MERGE_REQUEST_TIMEOUT_MS = 10000;

/**
 * A save the server refused (PostgREST/Postgres error code, e.g. an RLS or
 * foreign-key failure because the guide was unpublished) will never succeed;
 * anything else (network, timeout) is worth another try.
 */
function isPermanentSaveError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.length > 0;
}

/**
 * Copies a guest's device-only saves into the member account they just
 * signed in to (the same saves then show up on their other devices). Returns
 * true when anything was copied.
 *
 * Item by item: copied items and items the server refused for good leave the
 * device copy, so a later pass can never re-add a save the member removed in
 * the meantime; only items that failed for a temporary reason (offline,
 * timeout) stay for the next attempt. When nothing could be copied, no more
 * attempts are made for that member until the next launch.
 */
function mergeGuestItemsInto(userId: string) {
  if (!guestMergePromise) {
    guestMergePromise = (async () => {
      const guestItems = readPersistedSnapshot(GUEST_OWNER_ID);

      if (!guestItems || guestItems.countryIds.length + guestItems.documentIds.length === 0) {
        appStorage.remove(localStorageKeys.guestSavedItems);
        return false;
      }

      const copy = (save: Promise<void>) =>
        withTimeout(save, GUEST_MERGE_REQUEST_TIMEOUT_MS, "Saving took too long.").then(
          () => "copied" as const,
          (error: unknown) => {
            console.warn("Unable to copy a device save into the account", error);
            return isPermanentSaveError(error) ? ("refused" as const) : ("retry" as const);
          },
        );

      const retryCountryIds = new Set<string>();
      const retryDocumentIds = new Set<string>();
      let copied = 0;

      for (const countryId of guestItems.countryIds) {
        const outcome = await copy(setCountrySaved({ clerkUserId: userId, countryId, shouldSave: true }));
        copied += outcome === "copied" ? 1 : 0;
        if (outcome === "retry") retryCountryIds.add(countryId);
      }

      for (const documentId of guestItems.documentIds) {
        const outcome = await copy(
          setDocumentSaved({ clerkUserId: userId, documentId, shouldSave: true }),
        );
        copied += outcome === "copied" ? 1 : 0;
        if (outcome === "retry") retryDocumentIds.add(documentId);
      }

      if (retryCountryIds.size + retryDocumentIds.size === 0) {
        appStorage.remove(localStorageKeys.guestSavedItems);
      } else {
        writePersistedSnapshot({
          userId: GUEST_OWNER_ID,
          countryIds: retryCountryIds,
          documentIds: retryDocumentIds,
          countries: guestItems.countries.filter((item) => retryCountryIds.has(item.countryId)),
          documents: guestItems.documents.filter((item) => retryDocumentIds.has(item.documentId)),
          lastFetchedAt: guestItems.lastFetchedAt,
        });
      }

      if (copied === 0) {
        failedGuestMergeUserIds.add(userId);
      }

      return copied > 0;
    })().finally(() => {
      guestMergePromise = null;
    });
  }

  return guestMergePromise;
}

function clearMutation(
  pendingMutations: Record<string, SavedMutationStatus>,
  key: string,
) {
  const nextPendingMutations = { ...pendingMutations };
  delete nextPendingMutations[key];
  return nextPendingMutations;
}

export const useSavedStore = create<SavedStoreState>((set, get) => {
  /**
   * Makes `ownerId` the store's owner before a mutation. While a sign-in or
   * sign-out settles the list can still be the previous owner's (a guest's
   * device saves, or a member's cache); starting from it would mix their
   * items into this owner's list and write them under this owner's key. A
   * guest's stored saves are the only copy, so they are loaded, never reset.
   */
  const switchOwner = (ownerId: string) => {
    if (get().userId !== ownerId) {
      const guestItems = isGuestOwner(ownerId) ? readPersistedSnapshot(ownerId) : null;

      set({
        ...initialState,
        userId: ownerId,
        countryIds: new Set(guestItems?.countryIds ?? []),
        documentIds: new Set(guestItems?.documentIds ?? []),
        countries: guestItems?.countries ?? [],
        documents: guestItems?.documents ?? [],
        status: isGuestOwner(ownerId) ? "ready" : "idle",
        lastFetchedAt: guestItems?.lastFetchedAt ?? null,
        pendingMutations: get().pendingMutations,
      });
    }

    return get();
  };

  return {
    ...initialState,

    hydrateForUser: async (userId) => {
      if (isGuestOwner(userId)) {
        if (get().userId === userId && get().status === "ready") {
          return;
        }

        const guestItems = readPersistedSnapshot(userId);

        set({
          ...initialState,
          userId,
          countryIds: new Set(guestItems?.countryIds ?? []),
          documentIds: new Set(guestItems?.documentIds ?? []),
          countries: guestItems?.countries ?? [],
          documents: guestItems?.documents ?? [],
          status: "ready",
          lastFetchedAt: guestItems?.lastFetchedAt ?? null,
        });
        return;
      }

      if (appStorage.getString(localStorageKeys.guestSavedItems) && !failedGuestMergeUserIds.has(userId)) {
        // Leave the guest list before the (network) merge, so nothing edits it
        // under the member's id meanwhile.
        if (get().userId !== userId) {
          set({ ...initialState, userId, status: "loading" });
        }

        if (await mergeGuestItemsInto(userId)) {
          await get().refresh(userId);
          return;
        }
      }

      const currentState = get();

      if (
        currentState.userId === userId &&
        currentState.status === "ready" &&
        isFresh(currentState.lastFetchedAt)
      ) {
        return;
      }

      const snapshot = readPersistedSnapshot();
      const canUseSnapshot = snapshot?.userId === userId;

      if (canUseSnapshot) {
        const shouldReplaceState =
          currentState.userId !== userId ||
          currentState.lastFetchedAt !== snapshot.lastFetchedAt;

        if (!shouldReplaceState && isFresh(snapshot.lastFetchedAt)) {
          return;
        }

        set({
          userId,
          countryIds: new Set(snapshot.countryIds),
          documentIds: new Set(snapshot.documentIds),
          countries: snapshot.countries,
          documents: snapshot.documents,
          status: "ready",
          lastFetchedAt: snapshot.lastFetchedAt,
          pendingMutations: {},
        });

        if (!isFresh(snapshot.lastFetchedAt)) {
          void get().refresh(userId);
        }

        return;
      } else {
        appStorage.remove(localStorageKeys.savedItemsSnapshot);
        set({
          ...initialState,
          userId,
          status: "loading",
        });
      }

      await get().refresh(userId);
    },

    refresh: async (userId) => {
      if (isGuestOwner(userId)) {
        // Device-only saves: the stored copy is already the source of truth.
        set({ status: "idle" });
        return get().hydrateForUser(userId);
      }

      if (activeRefreshUserId === userId && activeRefreshPromise) {
        return activeRefreshPromise;
      }

      set((state) => ({
        userId,
        status:
          state.userId === userId &&
          (state.countries.length > 0 || state.documents.length > 0)
            ? "ready"
            : "loading",
      }));

      activeRefreshUserId = userId;
      activeRefreshPromise = (async () => {
        const savedItems = await fetchSavedItems(userId);
        const countryIds = countryIdsFrom(savedItems.countries);
        const documentIds = documentIdsFrom(savedItems.documents);
        const lastFetchedAt = Date.now();

        if (activeRefreshUserId !== userId) {
          return;
        }

        set({
          userId,
          countryIds,
          documentIds,
          countries: savedItems.countries,
          documents: savedItems.documents,
          status: "ready",
          lastFetchedAt,
          pendingMutations: {},
        });

        writePersistedSnapshot({
          userId,
          countryIds,
          documentIds,
          countries: savedItems.countries,
          documents: savedItems.documents,
          lastFetchedAt,
        });
      })()
        .catch((error) => {
          console.warn("Unable to refresh saved items", error);
          set({ status: "error" });
        })
        .finally(() => {
          if (activeRefreshUserId === userId) {
            activeRefreshUserId = null;
            activeRefreshPromise = null;
          }
        });

      return activeRefreshPromise;
    },

    saveCountryOptimistic: async ({ ownerId, countryId, country }) => {
      const key = mutationKey("country", countryId);
      const previousState = switchOwner(ownerId);
      const nextCountryIds = new Set(previousState.countryIds).add(countryId);
      const nextCountries =
        country && !previousState.countryIds.has(countryId)
          ? [country, ...previousState.countries]
          : previousState.countries;

      set({
        userId: ownerId,
        countryIds: nextCountryIds,
        countries: nextCountries,
        pendingMutations: {
          ...previousState.pendingMutations,
          [key]: "saving",
        },
      });

      writePersistedSnapshot({
        ...get(),
        userId: ownerId,
      });

      try {
        if (!isGuestOwner(ownerId)) {
          await setCountrySaved({ clerkUserId: ownerId, countryId, shouldSave: true });
        }
      } catch (error) {
        set({
          countryIds: previousState.countryIds,
          countries: previousState.countries,
        });
        writePersistedSnapshot(previousState);
        throw error;
      } finally {
        set((state) => ({
          pendingMutations: clearMutation(state.pendingMutations, key),
        }));
      }
    },

    unsaveCountryOptimistic: async ({ ownerId, countryId }) => {
      const key = mutationKey("country", countryId);
      const previousState = switchOwner(ownerId);
      const nextCountryIds = new Set(previousState.countryIds);
      nextCountryIds.delete(countryId);

      const nextCountries = previousState.countries.filter(
        (country) => country.countryId !== countryId,
      );

      set({
        userId: ownerId,
        countryIds: nextCountryIds,
        countries: nextCountries,
        pendingMutations: {
          ...previousState.pendingMutations,
          [key]: "removing",
        },
      });

      writePersistedSnapshot({
        ...get(),
        userId: ownerId,
      });

      try {
        if (!isGuestOwner(ownerId)) {
          await setCountrySaved({ clerkUserId: ownerId, countryId, shouldSave: false });
        }
      } catch (error) {
        set({
          countryIds: previousState.countryIds,
          countries: previousState.countries,
        });
        writePersistedSnapshot(previousState);
        throw error;
      } finally {
        set((state) => ({
          pendingMutations: clearMutation(state.pendingMutations, key),
        }));
      }
    },

    saveDocumentOptimistic: async ({ ownerId, documentId, document }) => {
      const key = mutationKey("document", documentId);
      const previousState = switchOwner(ownerId);
      const nextDocumentIds = new Set(previousState.documentIds).add(documentId);
      const nextDocuments =
        document && !previousState.documentIds.has(documentId)
          ? [document, ...previousState.documents]
          : previousState.documents;

      set({
        userId: ownerId,
        documentIds: nextDocumentIds,
        documents: nextDocuments,
        pendingMutations: {
          ...previousState.pendingMutations,
          [key]: "saving",
        },
      });

      writePersistedSnapshot({
        ...get(),
        userId: ownerId,
      });

      try {
        if (!isGuestOwner(ownerId)) {
          await setDocumentSaved({ clerkUserId: ownerId, documentId, shouldSave: true });
        }
      } catch (error) {
        set({
          documentIds: previousState.documentIds,
          documents: previousState.documents,
        });
        writePersistedSnapshot(previousState);
        throw error;
      } finally {
        set((state) => ({
          pendingMutations: clearMutation(state.pendingMutations, key),
        }));
      }
    },

    unsaveDocumentOptimistic: async ({ ownerId, documentId }) => {
      const key = mutationKey("document", documentId);
      const previousState = switchOwner(ownerId);
      const nextDocumentIds = new Set(previousState.documentIds);
      nextDocumentIds.delete(documentId);

      const nextDocuments = previousState.documents.filter(
        (document) => document.documentId !== documentId,
      );

      set({
        userId: ownerId,
        documentIds: nextDocumentIds,
        documents: nextDocuments,
        pendingMutations: {
          ...previousState.pendingMutations,
          [key]: "removing",
        },
      });

      writePersistedSnapshot({
        ...get(),
        userId: ownerId,
      });

      try {
        if (!isGuestOwner(ownerId)) {
          await setDocumentSaved({ clerkUserId: ownerId, documentId, shouldSave: false });
        }
      } catch (error) {
        set({
          documentIds: previousState.documentIds,
          documents: previousState.documents,
        });
        writePersistedSnapshot(previousState);
        throw error;
      } finally {
        set((state) => ({
          pendingMutations: clearMutation(state.pendingMutations, key),
        }));
      }
    },

    clearInMemory: () => {
      activeRefreshUserId = null;
      activeRefreshPromise = null;
      set(initialState);
    },

    /** Clears the in-memory list and the member cache; a guest's device saves stay. */
    reset: () => {
      activeRefreshUserId = null;
      activeRefreshPromise = null;
      appStorage.remove(localStorageKeys.savedItemsSnapshot);
      set(initialState);
    },
  };
});

export function useIsCountrySaved(countryId: string | null | undefined) {
  return useSavedStore((state) =>
    countryId ? state.countryIds.has(countryId) : false,
  );
}

export function useIsDocumentSaved(documentId: string | null | undefined) {
  return useSavedStore((state) =>
    documentId ? state.documentIds.has(documentId) : false,
  );
}

export function useSavedCountrySlugs() {
  const countries = useSavedStore((state) => state.countries);

  return useMemo(
    () => new Set(countries.map((country) => country.slug)),
    [countries],
  );
}
