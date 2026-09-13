/**
 * An error whose message was written for the user and may be shown as-is in
 * an alert, toast or notice. Any other error is mapped to friendly copy or a
 * generic fallback before it reaches the screen (see `features/auth/errors.ts`
 * and `features/billing/purchases.ts`), so SDK internals never leak into the UI.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
