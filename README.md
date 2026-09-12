# EU Work Support

EU Work Support is a mobile-first Expo application that helps users explore European work, visa, and country guidance. The app keeps the home experience public, then protects deeper country, visa, saved, search, and profile flows behind a verified PRO access model.

The project uses Expo Router, Clerk authentication, Supabase data access, a token-based StyleSheet design system with native SwiftUI controls from Expo UI, and a direct website email endpoint for account verification.

## Screenshots

<table>
  <tr>
    <td align="center"><strong>Home</strong></td>
    <td align="center"><strong>Search</strong></td>
    <td align="center"><strong>Saved</strong></td>
    <td align="center"><strong>Profile</strong></td>
    <td align="center"><strong>Country Detail</strong></td>
  </tr>
  <tr>
    <td><img src="assets/Screen/home.jpg" alt="EU Work Support home screen" width="170" /></td>
    <td><img src="assets/Screen/search.jpg" alt="EU Work Support search screen" width="170" /></td>
    <td><img src="assets/Screen/saved.jpg" alt="EU Work Support saved screen" width="170" /></td>
    <td><img src="assets/Screen/profile.jpg" alt="EU Work Support profile screen" width="170" /></td>
    <td><img src="assets/Screen/single_country.jpg" alt="EU Work Support country detail screen" width="170" /></td>
  </tr>
</table>

## Features

- Public home tab with country discovery, featured destinations, and quick navigation.
- PRO access model backed by Supabase `app_users.user_plan`.
- Premium route guards for search, saved items, profile, country details, and visa details.
- Login-only mobile auth UI with a separate account verification flow.
- Verification email request through the EU Work Support website endpoint.
- Saved country support for verified users.
- Onboarding flow for verified users.
- Profile, account, legal, support, app info, and danger-zone screens.
- Light and dark theme support through React Navigation and the local theme preference.

## Tech Stack

- Expo 55
- React Native 0.83
- React 19
- Expo Router
- TypeScript
- StyleSheet design tokens (`src/constants/theme.ts`) with React Native Reanimated animations
- Expo UI (SwiftUI) for native iOS controls, SF Symbols via expo-symbols, Liquid Glass via expo-glass-effect
- Clerk Expo SDK
- Supabase JavaScript client
- Sonner Native toasts
- Expo development client

## Project Structure

```text
src/
  app/                     Expo Router routes
    (auth)/                Login, verification, and auth redirects
    (tabs)/                Home, Search, Saved, Profile tabs
    country/[slug].tsx     Premium country detail route
    visa/[id].tsx          Premium visa detail route
    profile/               Profile sub-pages
  components/              Shared UI and app shell components
  constants/               Country data, policies, and theme values
  features/
    auth/                  Auth access model, guards, and auth UI
    onboarding/            Onboarding screens
  hooks/                   Shared React hooks
  lib/                     Supabase, Clerk, storage, toast, and email helpers
assets/
  Screen/                  README and store-style screen captures
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm
- Xcode for iOS development
- Android Studio for Android development
- A Clerk project
- A Supabase project configured for Clerk-issued access tokens

### Install Dependencies

```bash
pnpm install
```

### Configure Environment Variables

Create a local `.env` file from the template:

```bash
cp .env.example .env
```

Set the required values:

```bash
# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Optional if using a Clerk Supabase JWT template
EXPO_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE=

# OneSignal
EXPO_PUBLIC_ONESIGNAL_APP_ID=

# Website email endpoint API key
EXPO_PUBLIC_X_API_KEY=
```

The app sends verification email requests to:

```text
https://euworksupport.eu/api/send-payment-link
```

The request body is:

```json
{
  "email": "user@example.com",
  "name": "Welcome"
}
```

## Run the App

Start the Expo development server:

```bash
pnpm start
```

Run on iOS:

```bash
pnpm ios
```

Run on Android:

```bash
pnpm android
```

Run on web:

```bash
pnpm web
```

Because this project includes native dependencies and `expo-dev-client`, a development build is recommended for the most accurate local testing.

## Available Scripts

```bash
pnpm start          # Start Expo
pnpm ios            # Build and run the iOS app
pnpm android        # Build and run the Android app
pnpm web            # Start the web build
pnpm lint           # Run Expo lint
```

## Authentication and Access Flow

The app separates authentication from content access.

1. Users can browse the home tab without logging in.
2. Premium screens are wrapped with a reusable premium guard.
3. The login screen checks Supabase through `is_email_pro_user` before creating a Clerk session.
4. If the email is not verified as PRO, the user is sent to the verify screen.
5. The verify screen checks whether the email is already PRO before sending a verification email.
6. Signed-in PRO users can complete onboarding and access protected screens.

The shared access state lives in:

```text
src/features/auth/access.tsx
```

Premium route blocking is handled by:

```text
src/features/auth/components/premium-guard.tsx
src/features/auth/components/unauthenticated.tsx
```

## Supabase Requirements

The client expects Supabase to provide:

- An `app_users` table with Clerk user identity data.
- A `user_plan` value that resolves to `PRO` for verified premium users.
- An `ensure_user_profile()` RPC used after sign-in to create or load the user's profile row.
- An `is_email_pro_user(p_email text)` RPC used before login and before sending verification email.
- RLS policies that keep premium data available only to verified PRO users.

If login verification always fails, confirm that `is_email_pro_user` exists in Supabase and grants execute access to both `anon` and `authenticated` roles.

## Key Implementation Files

- `src/components/app-providers.tsx` wires Clerk, Supabase token bridging, theme providers, auth access, and the root auth gate.
- `src/features/auth/components/auth-switcher.tsx` owns the login form and pre-login PRO check.
- `src/app/(auth)/verify.tsx` owns the verification page and email request flow.
- `src/lib/send-website-payment-link.ts` sends the website verification email request.
- `src/lib/pro-account.ts` calls the public Supabase PRO email check.
- `src/components/home-demo.tsx` renders the public home tab and hides saved-data calls for non-PRO users.

## Design Notes

- The UI follows DESIGN.md ("The Diplomatic Atelier"): tonal surfaces instead of divider lines, Poppins headings with Inter body text, and spring-based micro interactions.
- Shared primitives live in `src/components/ui` (AppText, Surface, ListRow, FilterBar, IconButton, SearchField, TextField, state views).
- Settings uses a native SwiftUI Form (Expo UI) on iOS; Saved and detail screens use native context menus.
- The tab bar keeps Home public while Search, Saved, and Profile remain protected.
- The profile fallback name is `Welcome` when no user name has been saved.
- Auth screens use top navigation headers with back buttons and form content placed below the title.

## Troubleshooting

### Missing Environment Variables

If the app throws a missing environment variable error, check `src/lib/env.ts` and confirm every required value exists in `.env`.

### Login Redirects to Verify

This is expected when `is_email_pro_user(email)` returns `false`. Verify that the email exists in Supabase and its `user_plan` is `PRO`.

### Verification Email Does Not Send

Check:

- `EXPO_PUBLIC_X_API_KEY` is set.
- The website endpoint is reachable.
- The endpoint accepts the request body `{ email, name: "Welcome" }`.

### Premium Screens Show the Access Prompt

The user must be signed in and have `user_plan = PRO` in Supabase. The app intentionally treats all other plans as free access.

## Disclaimer

EU Work Support provides informational guidance about European work and visa pathways. It is not a government agency, law firm, immigration adviser, visa processor, or employment agency. Users should confirm important decisions with the relevant official government source.
