import { useAuth, useSignIn } from "@clerk/expo";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { AppText } from "@/components/ui/app-text";
import { NativeToggle } from "@/components/ui/native-toggle";
import { PressableScale } from "@/components/ui/pressable-scale";
import { TextField } from "@/components/ui/text-field";
import { Spacing } from "@/constants/theme";
import { AuthLayout, AuthNotice } from "@/features/auth/components/auth-layout";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { isEmailProUser } from "@/lib/pro-account";
import { showInfoToast } from "@/lib/toast";

const CLERK_SIGN_IN_TIMEOUT_MS = 20000;

type SecondFactorMethod = "email_code" | "phone_code";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export default function SignInScreen() {
  const { signIn } = useSignIn();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [secondFactorCode, setSecondFactorCode] = useState("");
  const [secondFactorMethod, setSecondFactorMethod] =
    useState<SecondFactorMethod | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestedReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const safeReturnTo =
    requestedReturnTo &&
    requestedReturnTo.startsWith("/") &&
    !requestedReturnTo.startsWith("//") &&
    requestedReturnTo !== "/sign-in"
      ? requestedReturnTo
      : "/";

  const openVerifyPage = (emailOverride?: string) => {
    const email = emailOverride ?? unverifiedEmail ?? emailAddress.trim();
    router.push(
      `/verify?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(
        safeReturnTo,
      )}` as Href,
    );
  };

  const finishSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setError(
            "This account needs another verification step before login can finish.",
          );
          return;
        }

        const url = decorateUrl(safeReturnTo);

        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }

        router.replace(url as Href);
      },
    });
  };

  const startSecondFactor = async () => {
    const hasEmailCode = signIn.supportedSecondFactors.some(
      (factor) => factor.strategy === "email_code",
    );
    const hasPhoneCode = signIn.supportedSecondFactors.some(
      (factor) => factor.strategy === "phone_code",
    );

    if (hasEmailCode) {
      const { error: sendError } = await withTimeout(
        signIn.mfa.sendEmailCode(),
        CLERK_SIGN_IN_TIMEOUT_MS,
        "Clerk did not send the verification code. Please try again.",
      );

      if (sendError) {
        setError(getAuthErrorMessage(sendError, "Unable to send verification code."));
        return;
      }

      setSecondFactorMethod("email_code");
      setSecondFactorCode("");
      showInfoToast("Check your email", "Enter the code to finish logging in.");
      return;
    }

    if (hasPhoneCode) {
      const { error: sendError } = await withTimeout(
        signIn.mfa.sendPhoneCode(),
        CLERK_SIGN_IN_TIMEOUT_MS,
        "Clerk did not send the verification code. Please try again.",
      );

      if (sendError) {
        setError(getAuthErrorMessage(sendError, "Unable to send verification code."));
        return;
      }

      setSecondFactorMethod("phone_code");
      setSecondFactorCode("");
      showInfoToast("Check your phone", "Enter the code to finish logging in.");
      return;
    }

    setError("This account needs a second factor that this app does not support yet.");
  };

  const handleSignIn = async () => {
    if (isSubmitting) {
      return;
    }

    if (!isLoaded) {
      setError("Sign-in could not start. Please close and reopen the app, then try again.");
      return;
    }

    setError(null);
    setUnverifiedEmail(null);
    setSecondFactorMethod(null);
    setSecondFactorCode("");

    const normalizedEmail = emailAddress.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      const isVerified = await isEmailProUser(normalizedEmail);

      if (!isVerified) {
        showInfoToast("No active access", "Request access to continue.");
        setUnverifiedEmail(normalizedEmail);
        openVerifyPage(normalizedEmail);
        return;
      }

      const { error: signInError } = await withTimeout(
        signIn.password({ emailAddress: normalizedEmail, password }),
        CLERK_SIGN_IN_TIMEOUT_MS,
        "Sign-in took too long. Check your connection and try again.",
      );

      if (signInError) {
        setError(getAuthErrorMessage(signInError, "Unable to log in with those details."));
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
        return;
      }

      if (
        signIn.status === "needs_client_trust" ||
        signIn.status === "needs_second_factor"
      ) {
        await startSecondFactor();
        return;
      }

      setError("Login could not finish. Please check your credentials and try again.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Unable to log in with those details."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecondFactor = async () => {
    if (isSubmitting || !secondFactorMethod || !secondFactorCode.trim()) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { error: verifyError } =
        secondFactorMethod === "email_code"
          ? await withTimeout(
              signIn.mfa.verifyEmailCode({ code: secondFactorCode.trim() }),
              CLERK_SIGN_IN_TIMEOUT_MS,
              "Clerk did not verify the code. Please try again.",
            )
          : await withTimeout(
              signIn.mfa.verifyPhoneCode({ code: secondFactorCode.trim() }),
              CLERK_SIGN_IN_TIMEOUT_MS,
              "Clerk did not verify the code. Please try again.",
            );

      if (verifyError) {
        setError(getAuthErrorMessage(verifyError, "Unable to verify that code."));
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
        return;
      }

      setError("That code was accepted, but login still needs another step.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Unable to verify that code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = secondFactorMethod
    ? secondFactorCode.trim().length > 0
    : emailAddress.trim().length > 0 && password.length > 0;

  return (
    <AuthLayout
      headerTitle="Log in"
      backIcon="close"
      title="Welcome back"
      subtitle="Log in to continue your country research, saved guides and more support."
      error={error}
    >
      {unverifiedEmail ? (
        <AuthNotice
          tone="primary"
          icon="info"
          text="No active access was found for this email. Request access and we will email you the next steps."
        />
      ) : null}

      <TextField
        label="Email"
        icon="mail"
        value={emailAddress}
        onChangeText={setEmailAddress}
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
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="password"
        placeholder="Your password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={secondFactorMethod ? undefined : handleSignIn}
      />

      {secondFactorMethod ? (
        <>
          <AuthNotice
            tone="primary"
            icon="shield"
            text={`Enter the code sent to your ${
              secondFactorMethod === "email_code" ? "email" : "phone"
            } to finish logging in.`}
          />
          <TextField
            label="Verification code"
            icon="keypad"
            value={secondFactorCode}
            onChangeText={setSecondFactorCode}
            autoCapitalize="none"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            placeholder="123456"
            textContentType="oneTimeCode"
            onSubmitEditing={handleSecondFactor}
          />
        </>
      ) : null}

      <NativeToggle value={rememberMe} onValueChange={setRememberMe} label="Remember me" />

      <View style={styles.forgotRow}>
        <PressableScale
          onPress={() => router.push("/forgot-password")}
          hitSlop={Spacing.sm}
          accessibilityRole="link"
          accessibilityLabel="Forgot password"
        >
          <AppText variant="label" color="primary">
            Forgot password?
          </AppText>
        </PressableScale>
      </View>

      <AppButton
        label={secondFactorMethod ? "Verify and log in" : "Log in"}
        icon="signIn"
        loading={isSubmitting}
        disabled={!canSubmit}
        onPress={secondFactorMethod ? handleSecondFactor : handleSignIn}
      />

      {secondFactorMethod ? (
        <AppButton
          label="Send a new code"
          variant="ghost"
          size="md"
          disabled={isSubmitting}
          onPress={startSecondFactor}
        />
      ) : null}

      {unverifiedEmail ? (
        <AppButton
          label="Request access"
          icon="mail"
          variant="secondary"
          onPress={() => openVerifyPage()}
        />
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -Spacing.sm,
  },
});
