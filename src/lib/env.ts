type RequiredPublicEnv = {
  clerkPublishableKey: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  oneSignalAppId: string;
};

type OptionalPublicEnv = {
  clerkSupabaseJwtTemplate?: string;
};

const requiredEnv = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_KEY,
  oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
} satisfies Record<keyof RequiredPublicEnv, string | undefined>;

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required public environment variables: ${missingEnv.join(", ")}`,
  );
}

export const env = requiredEnv as RequiredPublicEnv;

export const optionalEnv: OptionalPublicEnv = {
  clerkSupabaseJwtTemplate:
    process.env.EXPO_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE || undefined,
};
