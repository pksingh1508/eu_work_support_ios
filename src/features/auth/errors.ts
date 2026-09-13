import { UserFacingError } from "@/lib/user-facing-error";

type ClerkErrorLike = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
  message?: string;
};

const NETWORK_MESSAGE =
  "We could not reach the server. Check your connection and try again.";

/**
 * Friendly copy for the Clerk error codes users actually run into. Anything
 * not listed here falls back to the caller's message, never to raw SDK text.
 */
const clerkErrorMessages: Record<string, string> = {
  form_identifier_not_found: "We could not find an account with that email address.",
  form_password_incorrect: "That password is incorrect. Try again or reset your password.",
  form_identifier_exists: "An account with this email already exists. Log in instead.",
  form_param_format_invalid: "Please check the email address and try again.",
  form_param_nil: "Please fill in every field and try again.",
  form_password_pwned:
    "This password has appeared in a data breach. Please choose a different one.",
  form_password_length_too_short: "Your password is too short. Use at least 8 characters.",
  form_password_size_in_bytes_exceeded: "That password is too long.",
  form_password_not_strong_enough: "Please choose a stronger password.",
  form_password_validation_failed: "That password does not meet the requirements.",
  form_code_incorrect: "That code is not correct. Check the message and try again.",
  verification_expired: "That code has expired. Request a new one.",
  verification_failed: "We could not verify that code. Request a new one and try again.",
  verification_already_verified: "This email is already verified. You can log in.",
  too_many_requests: "Too many attempts. Please wait a moment and try again.",
  user_locked: "This account is temporarily locked after too many attempts. Try again later.",
  session_exists: "You are already logged in.",
  strategy_for_user_invalid: "This login method is not available for your account.",
  identifier_already_signed_in: "You are already logged in with this account.",
  not_allowed_access: "This account is not allowed to log in. Contact support if you think this is a mistake.",
};

function isNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /network request failed|failed to fetch|network error|timed out/i.test(message);
}

/**
 * Turns any auth failure into copy that can be shown on screen. Clerk API
 * errors are mapped by code; app-authored errors (`UserFacingError`) pass
 * through; everything else gets `fallback`.
 */
export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (error instanceof UserFacingError) {
    return error.message;
  }

  const code = getAuthErrorCode(error);

  if (code && clerkErrorMessages[code]) {
    return clerkErrorMessages[code];
  }

  if (isNetworkError(error)) {
    return NETWORK_MESSAGE;
  }

  return fallback;
}

/** Clerk API error code of the first error, e.g. `form_identifier_exists`. */
export function getAuthErrorCode(error: unknown) {
  return (error as ClerkErrorLike | null)?.errors?.[0]?.code;
}
