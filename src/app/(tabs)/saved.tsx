import { PremiumGuard } from "@/features/auth/components/premium-guard";
import { SavedScreen } from "@/features/saved/saved-screen";

export default function SavedRoute() {
  return (
    <PremiumGuard>
      <SavedScreen />
    </PremiumGuard>
  );
}
