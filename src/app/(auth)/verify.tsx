import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";

import { AppButton } from "@/components/ui/app-button";
import { TextField } from "@/components/ui/text-field";
import { AuthLayout, AuthNotice } from "@/features/auth/components/auth-layout";
import { isEmailProUser } from "@/lib/pro-account";
import { sendWebsitePaymentLink } from "@/lib/send-email";
import { showInfoToast } from "@/lib/toast";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeEmail(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    returnTo?: string | string[];
  }>();
  const initialEmail = useMemo(
    () => normalizeEmail(getParamValue(params.email) ?? ""),
    [params.email],
  );
  const returnTo = getParamValue(params.returnTo);
  const [emailAddress, setEmailAddress] = useState(initialEmail);
  const [hasSentLink, setHasSentLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = normalizeEmail(emailAddress);
  const canSubmit = isValidEmail(normalizedEmail);

  const openLogin = () => {
    const href = returnTo
      ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
      : "/sign-in";

    router.replace(href as Href);
  };

  const sendVerificationLink = async () => {
    if (isSubmitting || !canSubmit) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const alreadyVerified = await isEmailProUser(normalizedEmail);

      if (alreadyVerified) {
        showInfoToast("You already have access", "Log in to continue.");
        openLogin();
        return;
      }

      await sendWebsitePaymentLink(normalizedEmail);
      setHasSentLink(true);
    } catch (verificationError) {
      const message =
        verificationError instanceof Error
          ? verificationError.message
          : "Unable to send email right now.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      headerTitle="Request access"
      title={hasSentLink ? "Check your email" : "Request access"}
      subtitle={
        hasSentLink
          ? "We sent an email. Check your inbox or spam folder, then follow the link to finish."
          : "Enter your email and we will send you the next steps for your EU Work Support account."
      }
      error={error}
    >
      {hasSentLink ? (
        <AuthNotice
          tone="primary"
          icon="mail"
          text={`An email is on its way to ${normalizedEmail}.`}
        />
      ) : (
        <TextField
          label="Email"
          icon="mail"
          value={emailAddress}
          onChangeText={setEmailAddress}
          editable={!isSubmitting}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="name@example.com"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={sendVerificationLink}
        />
      )}

      {hasSentLink ? (
        <AppButton label="Log in" icon="signIn" onPress={openLogin} />
      ) : (
        <AppButton
          label="Request access"
          icon="mail"
          loading={isSubmitting}
          disabled={!canSubmit}
          onPress={sendVerificationLink}
        />
      )}

      {!hasSentLink ? (
        <AppButton
          label="Already have access? Log in"
          variant="ghost"
          size="md"
          onPress={openLogin}
        />
      ) : null}
    </AuthLayout>
  );
}
