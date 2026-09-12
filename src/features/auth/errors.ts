type ClerkErrorLike = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
  message?: string;
};

export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  const clerkError = error as ClerkErrorLike;
  const firstError = clerkError.errors?.[0];

  return firstError?.longMessage ?? firstError?.message ?? clerkError.message ?? fallback;
}

/** Clerk API error code of the first error, e.g. `form_identifier_exists`. */
export function getAuthErrorCode(error: unknown) {
  return (error as ClerkErrorLike).errors?.[0]?.code;
}
