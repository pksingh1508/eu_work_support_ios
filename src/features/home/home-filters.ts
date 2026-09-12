import type { FilterOption } from "@/components/ui/filter-bar";
import {
  easiestVisaCountries,
  europeanCountryNames,
  topRated,
  type CountryName,
} from "@/constants/country";

export type HomeFilterKey = "all" | "top-rated" | "easiest-visa";

export const homeFilterOptions: readonly FilterOption<HomeFilterKey>[] = [
  { key: "all", label: "All regions" },
  { key: "top-rated", label: "Top rated" },
  { key: "easiest-visa", label: "Easiest visa" },
];

export function getCountriesForFilter(filter: HomeFilterKey): readonly CountryName[] {
  switch (filter) {
    case "top-rated":
      return topRated;
    case "easiest-visa":
      return easiestVisaCountries;
    default:
      return europeanCountryNames;
  }
}
