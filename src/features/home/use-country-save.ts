import { useCallback, useRef, useState } from "react";

import { countryDetails, getCountrySlug, type CountryName } from "@/constants/country";
import { useAuthAccess } from "@/features/auth/access";
import { usePremiumGate } from "@/features/billing/premium-gate";
import { useSavedCountrySlugs, useSavedStore } from "@/features/saved/saved-store";
import { haptic } from "@/lib/haptics";
import { fetchCountryIdBySlug } from "@/lib/saved-items";
import { showErrorToast, showSavedToast, showUnsavedToast } from "@/lib/toast";

/**
 * Save / unsave a country from the home list. Resolves the Supabase id
 * lazily (once per slug) and applies the optimistic store mutation.
 */
export function useCountrySave() {
  const { isAuthLoaded, contentSource, savedItemsOwnerId } = useAuthAccess();
  const { planStatus, showPremiumRequired } = usePremiumGate();
  const savedCountrySlugs = useSavedCountrySlugs();
  const pendingMutations = useSavedStore((state) => state.pendingMutations);
  const saveCountryOptimistic = useSavedStore(
    (state) => state.saveCountryOptimistic,
  );
  const unsaveCountryOptimistic = useSavedStore(
    (state) => state.unsaveCountryOptimistic,
  );
  const countryIdsBySlugRef = useRef<Record<string, string>>({});
  const [resolvingSlug, setResolvingSlug] = useState<string | null>(null);

  // The bookmark is visible to everyone, account or not; Free-plan taps get
  // the upgrade prompt instead of a failed request.
  const canSave = isAuthLoaded;

  const toggleSave = useCallback(
    async (country: CountryName) => {
      if (planStatus !== "pro" || !savedItemsOwnerId) {
        if (planStatus === "free") {
          showPremiumRequired("save", country);
        }
        return;
      }

      const slug = getCountrySlug(country);
      const shouldSave = !savedCountrySlugs.has(slug);
      setResolvingSlug(slug);

      try {
        let countryId = countryIdsBySlugRef.current[slug];

        if (!countryId) {
          const resolvedId = await fetchCountryIdBySlug(slug, contentSource);

          if (!resolvedId) {
            throw new Error("Country not found.");
          }

          countryId = resolvedId;
          countryIdsBySlugRef.current[slug] = resolvedId;
        }

        if (shouldSave) {
          haptic.success();
          void saveCountryOptimistic({
            ownerId: savedItemsOwnerId,
            countryId,
            country: {
              id: `country:${countryId}`,
              countryId,
              slug,
              name: country,
              flagEmoji: null,
              shortDescription: countryDetails[country].summary,
              createdAt: new Date().toISOString(),
            },
          }).catch((error) => {
            console.warn("Unable to update saved country", error);
            showErrorToast("Could not save country", "Please try again in a moment.");
          });
          showSavedToast(country, "country");
        } else {
          haptic.light();
          void unsaveCountryOptimistic({ ownerId: savedItemsOwnerId, countryId }).catch(
            (error) => {
              console.warn("Unable to update saved country", error);
              showErrorToast(
                "Could not remove country",
                "Please try again in a moment.",
              );
            },
          );
          showUnsavedToast(country, "country");
        }
      } catch (error) {
        console.warn("Unable to update saved country", error);
        showErrorToast(
          "Could not update saved country",
          "Please try again in a moment.",
        );
      } finally {
        setResolvingSlug(null);
      }
    },
    [
      contentSource,
      planStatus,
      saveCountryOptimistic,
      savedCountrySlugs,
      savedItemsOwnerId,
      showPremiumRequired,
      unsaveCountryOptimistic,
    ],
  );

  const isSaved = useCallback(
    (slug: string) => savedCountrySlugs.has(slug),
    [savedCountrySlugs],
  );

  const isSaving = useCallback(
    (slug: string) => {
      if (resolvingSlug === slug) {
        return true;
      }

      const countryId = countryIdsBySlugRef.current[slug];
      return Boolean(countryId && pendingMutations[`country:${countryId}`]);
    },
    [pendingMutations, resolvingSlug],
  );

  return { canSave, toggleSave, isSaved, isSaving };
}
