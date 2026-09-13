import { UserFacingError } from "@/lib/user-facing-error";

/**
 * Rejects with `message` if `promise` has not settled within `timeoutMs`.
 * Used around network calls (Clerk, Supabase) so a stalled request never
 * leaves a button spinning forever. `message` is shown to the user as-is.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new UserFacingError(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
