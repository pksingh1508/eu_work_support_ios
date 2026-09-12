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
2. Premium screens are wrapped with a reusable premium guard that offers **Log in** and **Sign up**.
3. Login uses Clerk email + password (with optional email / SMS second factor).
4. Sign-up collects optional first and last name, email and password, then verifies the email with a 6-digit Clerk code before the session is activated.
5. After sign-up the app calls `ensure_user_profile` and stores the names in `app_users`, so the profile screen shows them straight away.
6. Content access is decided by the Supabase profile's `user_plan`:
   - `Free` members see a Free-plan message with a **Buy Premium** button on country pages, guide pages, the Search and Saved tabs and any save action.
   - `PRO` members get everything.
7. The **Billing** tab sells Premium as a one-time purchase (USD 59, lifetime access) through RevenueCat / App Store In-App Purchase. After a purchase the app polls the profile until the RevenueCat webhook (`supabase/functions/revenuecat-webhook`) flips `user_plan` to `PRO`. The full setup checklist (App Store Connect, RevenueCat, Supabase, testing, App Review) is in [IAP.md](IAP.md).

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
- RLS policies that keep premium data available only to verified PRO users.

## Key Implementation Files

- `src/components/app-providers.tsx` wires Clerk, Supabase token bridging, theme providers, auth access, and the root auth gate.
- `src/app/(auth)/sign-in.tsx` owns the login form (password + optional second factor).
- `src/app/(auth)/sign-up.tsx` owns account creation and email code verification.
- `src/features/auth/components/unauthenticated.tsx` is the logged-out card with the Log in / Sign up buttons.
- `src/features/billing/` holds the Billing tab, the Free-plan paywall card, the `usePremiumGate` hook and the RevenueCat wrapper (`purchases.ts`).
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

### iOS Login Times Out or Clerk Never Loads

Clerk saves its client token with `expo-secure-store`. An iOS build without Keychain entitlements can fail during initialization with `ERR_KEY_CHAIN` / "A required entitlement isn't present", even when the same account works on Android.

The app-specific Keychain access group is configured in `app.json`. Regenerate the native iOS project after entitlement changes (`pnpm exec expo prebuild --platform ios --no-install`), then rebuild and reinstall the app; Metro reloads cannot update native entitlements.

Keep code signing enabled for simulator builds. If building locally without an Apple development certificate, use simulator ad-hoc signing with `xcodebuild -sdk iphonesimulator CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES` together with the workspace, scheme, and simulator destination. Do not use `CODE_SIGNING_ALLOWED=NO` to work around certificate errors: that can leave Keychain unavailable.

### Buy Premium Says Purchases Are Unavailable

`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (and the Android key) must be set, the app must be rebuilt after adding `react-native-purchases`, and the RevenueCat project needs a current offering with a lifetime package (`$rc_lifetime`) mapped to the App Store non-consumable product. The entitlement identifier must be `premium`.

### Sign-up Code Never Arrives

Clerk sends the 6-digit code from the instance's email provider. Check the Clerk dashboard's email settings and the user's spam folder; the app offers a resend after a 30-second cooldown.

### Premium Screens Show the Access Prompt

The user must be signed in and have `user_plan = PRO` in Supabase. The app intentionally treats all other plans as free access.

## Disclaimer

EU Work Support provides informational guidance about European work and visa pathways. It is not a government agency, law firm, immigration adviser, visa processor, or employment agency. Users should confirm important decisions with the relevant official government source.
