import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { AuthNotice } from "@/features/auth/components/auth-layout";
import { AccountGuard } from "@/features/auth/components/account-guard";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";

type EditableProfile = {
  first_name: string | null;
  last_name: string | null;
};

export default function EditProfileScreen() {
  return (
    <AccountGuard>
      <EditProfileContent />
    </AccountGuard>
  );
}

function EditProfileContent() {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const { refreshProfile } = useAuthAccess();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!userId) {
        setIsLoading(false);
        setError("Unable to load your account.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await supabase.rpc("ensure_user_profile");

        const { data, error: profileError } = await supabase
          .from("app_users")
          .select("first_name, last_name")
          .eq("clerk_user_id", userId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        const profile = data as EditableProfile | null;

        if (isActive) {
          setFirstName(profile?.first_name ?? "");
          setLastName(profile?.last_name ?? "");
        }
      } catch (loadError) {
        console.warn("Unable to load editable profile", loadError);

        if (isActive) {
          setError("Unable to load your profile details.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const updateProfile = async () => {
    if (!userId || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const nextFirstName = firstName.trim() || null;
    const nextLastName = lastName.trim() || null;

    try {
      await supabase.rpc("ensure_user_profile");

      const { error: updateError } = await supabase
        .from("app_users")
        .update({
          first_name: nextFirstName,
          last_name: nextLastName,
          email: user?.primaryEmailAddress?.emailAddress ?? null,
        })
        .eq("clerk_user_id", userId);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
      haptic.success();
      router.back();
    } catch (updateError) {
      console.warn("Unable to update profile", updateError);
      haptic.error();
      setError("Unable to update your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboard header={<ScreenHeader padded title="Edit profile" />}>
      <Entrance from="none">
        <AppText variant="title2">Your name</AppText>
        <AppText variant="subhead" color="textSecondary" style={styles.subtitle}>
          Set the name shown on your EU Work Support profile.
        </AppText>
      </Entrance>

      {error ? (
        <Entrance style={styles.notice}>
          <AuthNotice tone="error" icon="alert" text={error} />
        </Entrance>
      ) : null}

      <Entrance delay={60} style={styles.form}>
        <Surface>
          {isLoading ? (
            <View style={styles.fields}>
              <Skeleton height={16} width={80} />
              <Skeleton height={56} />
              <Skeleton height={16} width={80} />
              <Skeleton height={56} />
            </View>
          ) : (
            <View style={styles.fields}>
              <TextField
                label="First name"
                icon="person"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
              />
              <TextField
                label="Last name"
                icon="person"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="done"
                onSubmitEditing={updateProfile}
              />
              <AppButton
                label="Save changes"
                icon="check"
                loading={isSubmitting}
                onPress={updateProfile}
                style={styles.submit}
              />
            </View>
          )}
        </Surface>
      </Entrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: Spacing.sm,
  },
  notice: {
    marginTop: Spacing.xl,
  },
  form: {
    marginTop: Spacing.xl,
  },
  fields: {
    gap: Spacing.lg,
  },
  submit: {
    marginTop: Spacing.xs,
  },
});
