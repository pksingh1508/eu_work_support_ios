import { PremiumGuard } from "@/features/auth/components/premium-guard";
import { CountryScreen } from "@/features/countries/country-screen";

export default function CountryDetailRoute() {
  return (
    <PremiumGuard>
      <CountryScreen />
    </PremiumGuard>
  );
}
