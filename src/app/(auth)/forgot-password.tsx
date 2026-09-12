import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useState } from "react";

import { AppButton } from "@/components/ui/app-button";
import { TextField } from "@/components/ui/text-field";
import { AuthLayout, AuthNotice } from "@/features/auth/components/auth-layout";
import { getAuthErrorMessage } from "@/features/auth/errors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [hasSentCode, setHasSentCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendResetCode = async () => {
    if (!isLoaded || isSubmitting || !emailAddress.trim()) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress.trim(),
      });

      setHasSentCode(true);
      setNotice("We sent a password reset code to your email.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Unable to send a reset code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (!isLoaded || isSubmitting || !resetCode.trim() || !newPassword) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: newPassword,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
        return;
      }

      if (result.status === "needs_second_factor") {
        setError(
          "This account needs one more verification step before the reset can finish.",
        );
        return;
      }

      setError("Password reset needs another step before it can finish.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Unable to reset password with that code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const useDifferentEmail = () => {
    setHasSentCode(false);
    setResetCode("");
    setNewPassword("");
    setNotice(null);
    setError(null);
  };

  return (
    <AuthLayout
      headerTitle="Reset password"
      title={hasSentCode ? "Check your email" : "Reset password"}
      subtitle={
        hasSentCode
          ? "Enter the code from your email and choose a new password."
          : "Enter your email and we will send a secure reset code."
      }
      error={error}
    >
      {notice ? <AuthNotice tone="primary" icon="mail" text={notice} /> : null}

      <TextField
        label="Email address"
        icon="mail"
        value={emailAddress}
        onChangeText={setEmailAddress}
        editable={!hasSentCode && !isSubmitting}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="name@example.com"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={hasSentCode ? undefined : sendResetCode}
      />

      {hasSentCode ? (
        <>
          <TextField
            label="Reset code"
            icon="keypad"
            value={resetCode}
            onChangeText={setResetCode}
            autoCapitalize="none"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            placeholder="123456"
            textContentType="oneTimeCode"
          />

          <TextField
            label="New password"
            icon="lock"
            secureToggle
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            placeholder="New password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={resetPassword}
          />

          <AppButton
            label="Reset password"
            icon="key"
            loading={isSubmitting}
            disabled={!resetCode.trim() || !newPassword}
            onPress={resetPassword}
          />

          <AppButton
            label="Use a different email"
            variant="ghost"
            size="md"
            disabled={isSubmitting}
            onPress={useDifferentEmail}
          />
        </>
      ) : (
        <AppButton
          label="Send reset code"
          icon="mail"
          loading={isSubmitting}
          disabled={!emailAddress.trim()}
          onPress={sendResetCode}
        />
      )}

      <AppButton
        label="Back to log in"
        variant="ghost"
        size="md"
        onPress={() => router.back()}
      />
    </AuthLayout>
  );
}
