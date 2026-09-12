import { PremiumGuard } from "@/features/auth/components/premium-guard";
import { ProfileScreen } from "@/features/profile/profile-screen";

export default function ProfileRoute() {
  return (
    <PremiumGuard>
      <ProfileScreen />
    </PremiumGuard>
  );
}
