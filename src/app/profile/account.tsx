import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { NativeList } from "@/components/ui/native-list";
import { Screen } from "@/components/ui/screen";
import { useAuthAccess } from "@/features/auth/access";
import { AccountGuard } from "@/features/auth/components/account-guard";
import { confirmDestructive } from "@/lib/confirm";
import { haptic } from "@/lib/haptics";
import { clearCachedAuthSnapshot } from "@/lib/local-storage";

export default function ProfileAccountScreen() {
  return (
    <AccountGuard>
      <ProfileAccountContent />
    </AccountGuard>
  );
}

function ProfileAccountContent() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { profile } = useAuthAccess();

  const email = profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const databaseName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fullName = databaseName || user?.fullName || user?.firstName || "Welcome";

  const handleSignOut = async () => {
    haptic.warning();
    const confirmed = await confirmDestructive({
      title: "Sign out of EU Work Support?",
      message: "Premium bought with this account comes back when you log in again.",
      confirmLabel: "Sign Out",
    });

    if (confirmed) {
      clearCachedAuthSnapshot();
      await signOut();
    }
  };

  return (
    <Screen nativeHeader padded={false} edges={[]}>
      <NativeList
        identity={{ name: fullName, detail: email || undefined }}
        sections={[
          {
            key: "details",
            title: "Details",
            rows: [
              {
                key: "edit",
                title: "Edit Profile",
                icon: "edit",
                onPress: () => router.push("/profile/edit"),
              },
              {
                key: "password",
                title: "Change Password",
                icon: "lock",
                onPress: () => router.push("/profile/change-password"),
              },
            ],
          },
          {
            key: "session",
            rows: [
              {
                key: "sign-out",
                title: "Sign Out",
                icon: "signOut",
                destructive: true,
                chevron: false,
                onPress: () => void handleSignOut(),
              },
            ],
          },
        ]}
      />
    </Screen>
  );
}
