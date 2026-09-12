import { useAuth, useSignUp } from "@clerk/expo";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { Entrance } from "@/components/ui/entrance";
import { PressableScale } from "@/components/ui/pressable-scale";
import { TextField } from "@/components/ui/text-field";
import { Spacing } from "@/constants/theme";
import { useAuthAccess } from "@/features/auth/access";
import { AuthLayout, AuthNotice } from "@/features/auth/components/auth-layout";
import { getAuthErrorCode, getAuthErrorMessage } from "@/features/auth/errors";
import { authHref, getSafeReturnTo } from "@/features/auth/return-to";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { showInfoToast, showSuccessToast } from "@/lib/toast";
import { withTimeout } from "@/lib/with-timeout";

const CLERK_SIGN_UP_TIMEOUT_MS = 20000;
const PROFILE_SYNC_TIMEOUT_MS = 6000;
const MIN_PASSWORD_LENGTH = 8;
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type SignUpStep = "details" | "verify";

type FieldErrors = {
  email?: string;
  password?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Two-step sign-up: account details, then the 6-digit email code Clerk
 * sends. The Clerk instance requires email + password and verifies the
 * email at sign-up; first / last name are optional.
 */
export default function SignUpScreen() {
  const { signUp } = useSignUp();
  const { isLoaded } = useAuth();
  const { refreshProfile } = useAuthAccess();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const safeReturnTo = getSafeReturnTo(returnTo);

  const [step, setStep] = useState<SignUpStep>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const normalizedEmail = emailAddress.trim().toLowerCase();

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  const openLogin = () => {
    router.replace(authHref("/sign-in", safeReturnTo));
  };

  /**
   * The app reads display names from Supabase (`app_users`), so copy the
   * names collected at sign-up there. Best effort: a failure here must not
   * block the user from getting into the app.
   */
  const persistProfileNames = async (userId: string | undefined) => {
    const nextFirstName = firstName.trim() || null;
    const nextLastName = lastName.trim() || null;

    if (!userId || (!nextFirstName && !nextLastName)) {
      return;
    }

    try {
      await withTimeout(
        (async () => {
          await supabase.rpc("ensure_user_profile");

          const { error: updateError } = await supabase
            .from("app_users")
            .update({
              first_name: nextFirstName,
              last_name: nextLastName,
              email: normalizedEmail,
            })
            .eq("clerk_user_id", userId);

          if (updateError) {
            throw updateError;
          }
        })(),
        PROFILE_SYNC_TIMEOUT_MS,
        "Profile sync timed out.",
      );

      void refreshProfile();
    } catch (syncError) {
      console.warn("Unable to save profile names after sign-up", syncError);
    }
  };

  const completeSignUp = async () => {
    const { error: finalizeError } = await signUp.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setError("Your account was created, but it needs one more step before you can log in.");
          return;
        }

        await persistProfileNames(session?.user?.id);
        haptic.success();
        showSuccessToast(
          firstName.trim() ? `Welcome, ${firstName.trim()}` : "Welcome aboard",
          "Your account is ready.",
        );

        const url = decorateUrl(safeReturnTo);

        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }

        router.replace(url as Href);
      },
    });

    if (finalizeError) {
      setError(getAuthErrorMessage(finalizeError, "Unable to finish creating your account."));
    }
  };

  const sendEmailCode = async () => {
    const { error: sendError } = await withTimeout(
      signUp.verifications.sendEmailCode(),
      CLERK_SIGN_UP_TIMEOUT_MS,
      "Clerk did not send the verification code. Please try again.",
    );

    if (sendError) {
      setError(getAuthErrorMessage(sendError, "Unable to send the verification code."));
      return false;
    }

    setResendSeconds(RESEND_COOLDOWN_SECONDS);
    return true;
  };

  const validateDetails = () => {
    const nextErrors: FieldErrors = {};

    if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (isSubmitting) {
      return;
    }

    if (!isLoaded) {
      setError("Sign-up could not start. Please close and reopen the app, then try again.");
      return;
    }

    setError(null);
    setEmailExists(false);

    if (!validateDetails()) {
      haptic.error();
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: createError } = await withTimeout(
        signUp.password({
          emailAddress: normalizedEmail,
          password,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
        CLERK_SIGN_UP_TIMEOUT_MS,
        "Sign-up took too long. Check your connection and try again.",
      );

      if (createError) {
        const errorCode = getAuthErrorCode(createError);

        if (errorCode === "form_identifier_exists") {
          setEmailExists(true);
          setFieldErrors({ email: "This email already has an account." });
          return;
        }

        if (errorCode?.startsWith("form_password")) {
          setFieldErrors({
            password: getAuthErrorMessage(createError, "Choose a stronger password."),
          });
          return;
        }

        setError(getAuthErrorMessage(createError, "Unable to create your account."));
        return;
      }

      if (signUp.status === "complete") {
        await completeSignUp();
        return;
      }

      if (signUp.unverifiedFields.includes("email_address")) {
        const sent = await sendEmailCode();

        if (!sent) {
          return;
        }

        setCode("");
        setStep("verify");
        showInfoToast("Check your email", `We sent a ${CODE_LENGTH}-digit code to ${normalizedEmail}.`);
        return;
      }

      setError("Sign-up needs another step that this app does not support yet.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Unable to create your account."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const nextCode = (codeOverride ?? code).trim();

    if (isSubmitting || nextCode.length !== CODE_LENGTH) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { error: verifyError } = await withTimeout(
        signUp.verifications.verifyEmailCode({ code: nextCode }),
        CLERK_SIGN_UP_TIMEOUT_MS,
        "Clerk did not verify the code. Please try again.",
      );

      if (verifyError) {
        haptic.error();
        setCode("");
        setError(getAuthErrorMessage(verifyError, "That code is not valid. Please try again."));
        return;
      }

      if (signUp.status === "complete") {
        await completeSignUp();
        return;
      }

      setError("Your email is verified, but sign-up still needs another step.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Unable to verify that code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);

    if (digits.length === CODE_LENGTH) {
      void handleVerify(digits);
    }
  };

  const handleResend = async () => {
    if (isSubmitting || resendSeconds > 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const sent = await sendEmailCode();

      if (sent) {
        setCode("");
        showInfoToast("New code sent", `Check ${normalizedEmail} for the latest code.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = async () => {
    if (isSubmitting) {
      return;
    }

    await signUp.reset();
    setCode("");
    setError(null);
    setResendSeconds(0);
    setStep("details");
  };

  const canCreate =
    normalizedEmail.length > 0 && password.length > 0 && !isSubmitting;
  const canVerify = code.length === CODE_LENGTH && !isSubmitting;
  const isVerifyStep = step === "verify";

  return (
    <AuthLayout
      headerTitle={isVerifyStep ? "Verify email" : "Sign up"}
      backIcon="close"
      title={isVerifyStep ? "Check your email" : "Create your account"}
      subtitle={
        isVerifyStep
          ? `Enter the ${CODE_LENGTH}-digit code we sent to ${normalizedEmail} to finish setting up your account.`
          : "Join EU Work Support for country guides, search and saved items across Europe."
      }
      error={error}
    >
      {isVerifyStep ? (
        <Entrance key="verify" delay={0}>
          <View style={styles.fields}>
            <TextField
              label="Verification code"
              icon="keypad"
              value={code}
              onChangeText={handleCodeChange}
              autoFocus
              autoCapitalize="none"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              placeholder="123456"
              textContentType="oneTimeCode"
              returnKeyType="done"
              helper="The code expires after a few minutes."
              onSubmitEditing={() => handleVerify()}
            />

            <AppButton
              label="Verify and continue"
              icon="check"
              loading={isSubmitting}
              disabled={!canVerify}
              onPress={() => handleVerify()}
            />

            <AppButton
              label={
                resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Send a new code"
              }
              variant="ghost"
              size="md"
              disabled={isSubmitting || resendSeconds > 0}
              onPress={handleResend}
            />

            <View style={styles.switchRow}>
              <AppText variant="callout" color="textSecondary">
                Wrong email?
              </AppText>
              <PressableScale
                onPress={handleChangeEmail}
                hitSlop={Spacing.sm}
                accessibilityRole="link"
                accessibilityLabel="Use a different email"
              >
                <AppText variant="label" color="primary">
                  Use a different email
                </AppText>
              </PressableScale>
            </View>
          </View>
        </Entrance>
      ) : (
        <Entrance key="details" delay={0}>
          <View style={styles.fields}>
            {emailExists ? (
              <AuthNotice
                tone="primary"
                icon="info"
                text="An account with this email already exists. Log in instead, or reset your password if you forgot it."
              />
            ) : null}

            <View style={styles.nameRow}>
              <TextField
                label="First name"
                icon="person"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                placeholder="Optional"
                textContentType="givenName"
                returnKeyType="next"
                containerStyle={styles.nameField}
              />
              <TextField
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                placeholder="Optional"
                textContentType="familyName"
                returnKeyType="next"
                containerStyle={styles.nameField}
              />
            </View>

            <TextField
              label="Email"
              icon="mail"
              value={emailAddress}
              onChangeText={(value) => {
                setEmailAddress(value);
                setEmailExists(false);
                if (fieldErrors.email) {
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }
              }}
              error={fieldErrors.email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="name@example.com"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <TextField
              label="Password"
              icon="lock"
              secureToggle
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (fieldErrors.password) {
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }
              }}
              error={fieldErrors.password}
              helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="Create a password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleCreateAccount}
            />

            <AppButton
              label="Create account"
              icon="personAdd"
              loading={isSubmitting}
              disabled={!canCreate}
              onPress={handleCreateAccount}
            />

            {emailExists ? (
              <AppButton
                label="Log in instead"
                icon="signIn"
                variant="secondary"
                onPress={openLogin}
              />
            ) : null}

            <View style={styles.switchRow}>
              <AppText variant="callout" color="textSecondary">
                Already have an account?
              </AppText>
              <PressableScale
                onPress={openLogin}
                hitSlop={Spacing.sm}
                accessibilityRole="link"
                accessibilityLabel="Log in"
              >
                <AppText variant="label" color="primary">
                  Log in
                </AppText>
              </PressableScale>
            </View>
          </View>
        </Entrance>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.lg,
  },
  nameRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  nameField: {
    flex: 1,
    minWidth: 0,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
});
