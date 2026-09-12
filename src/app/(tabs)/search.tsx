import { PremiumGuard } from "@/features/auth/components/premium-guard";
import { SearchScreen } from "@/features/search/search-screen";

export default function SearchRoute() {
  return (
    <PremiumGuard>
      <SearchScreen />
    </PremiumGuard>
  );
}
