# Apple In-App Purchase (Premium, one-time $59)

This document explains how Premium is sold inside the app and every step you still
have to do outside the codebase. Follow the sections in order; each one depends on
the previous one.

## 1. How it works

```
User taps "Buy Premium"
  → react-native-purchases (RevenueCat SDK) shows the App Store payment sheet (StoreKit 2)
  → Apple charges the user's App Store account
  → RevenueCat validates the receipt and grants the `premium` entitlement
  → RevenueCat calls the Supabase Edge Function `revenuecat-webhook`
  → The function sets app_users.user_plan = 'PRO'
  → The app re-reads the profile and unlocks countries, guides, search and saves
```

Why RevenueCat instead of talking to StoreKit directly:

- Apple requires digital content to be sold through In-App Purchase (Guideline 3.1.1).
  RevenueCat wraps StoreKit 2 (products, purchase sheet, receipts, restores,
  refunds, Family Sharing) and gives you a dashboard and a webhook for free.
- Content access is enforced by Supabase Row Level Security through
  `app_users.user_plan`. The client never writes `user_plan`; only the webhook
  (service role) does. That makes the paywall impossible to bypass from a
  jailbroken device.

Identifiers used everywhere (keep them identical in every dashboard):

| Item | Value |
| --- | --- |
| App Store product id (non-consumable) | `eu_work_support_premium_lifetime` |
| RevenueCat entitlement id | `premium` |
| RevenueCat offering | `default` (current) |
| RevenueCat package | Lifetime (`$rc_lifetime`) |
| Price | USD 59, one-time |
| iOS bundle id | `ios.euworksupport.app` |

What is already in the repo:

| Piece | Where |
| --- | --- |
| SDK install (`react-native-purchases` 10.x) | `package.json`, pods installed in `ios/` |
| SDK lifecycle: configure at launch, `logIn(clerkUserId)` / `logOut`, entitlement listener | `src/features/billing/purchases.ts`, `purchases-bridge.tsx` (mounted in `app-providers.tsx`) |
| Purchase / restore flow with post-purchase activation polling | `src/features/billing/use-premium-purchase.ts` |
| Billing tab UI, feature list, price, Restore, Terms/Privacy links | `src/features/billing/billing-screen.tsx` |
| Free-plan paywall + "Buy Premium" on country, guide, Search and Saved | `src/features/billing/paywall-card.tsx`, `premium-gate.ts` |
| Webhook that mirrors purchases into Supabase and sets `user_plan` | `supabase/functions/revenuecat-webhook/index.ts` |
| StoreKit configuration for simulator testing | `store/EUWorkSupport.storekit` |
| Env keys | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` |

## 2. Apple Developer and App Store Connect

1. **Sign the Paid Apps agreement.** App Store Connect → Business → Agreements.
   Fill in banking, tax forms and contact info. Until this is "Active", products
   never load and StoreKit returns an empty list.
2. **Enable In-App Purchase on the App ID.** Apple Developer → Identifiers →
   `ios.euworksupport.app` → Capabilities → check *In-App Purchase*. Xcode adds
   the capability automatically when you archive with an App Store profile;
   no entitlement file is needed for StoreKit.
3. **Create the product.** App Store Connect → your app → *In-App Purchases* →
   *+* → **Non-Consumable**.
   - Reference name: `Premium (Lifetime)`
   - Product ID: `eu_work_support_premium_lifetime` (cannot be changed later)
   - Price schedule: pick the USD 59 price point; let Apple auto-generate other
     territories, or set them manually.
   - Localization (English at minimum): Display name `EU Work Support Premium`,
     description `Lifetime access to every country guide and document.`
   - Review information: upload a screenshot of the Billing tab (any device
     size) and add a review note such as "One-time purchase that unlocks all
     country guides. Log in with the test account below to see the Free-plan
     state." The product must show status **Ready to Submit**.
   - Availability: all territories where the app is sold.
4. **Attach the product to the next app version.** On the version page, section
   *In-App Purchases and Subscriptions*, add the product. Apple only reviews a
   product together with a binary the first time.
5. **Create an In-App Purchase API key** (StoreKit 2 server validation).
   App Store Connect → Users and Access → *Integrations* → *In-App Purchase* →
   *Generate*. Download the `.p8` once, note the Key ID and Issuer ID. You
   will upload it to RevenueCat.
6. **Create a sandbox tester.** Users and Access → *Sandbox* → *Testers* → *+*.
   Use a fresh email; on a test device sign into it under *Settings → App
   Store → Sandbox Account*. Never sign into the real App Store with it.

## 3. RevenueCat

1. Create a project at <https://app.revenuecat.com> named **EU Work Support**.
2. **Add the iOS app.** Project settings → *Apps* → *+ New* → App Store →
   bundle id `ios.euworksupport.app`. Under *In-App Purchase Key configuration*
   upload the `.p8` from step 2.5 with its Key ID and Issuer ID. Under
   *App-Specific Shared Secret* paste the secret from App Store Connect →
   your app → *App Information* → *App-Specific Shared Secret* (needed for
   legacy receipt validation).
3. **Import the product.** *Products* → *+ New* (or *Import*) → store
   product `eu_work_support_premium_lifetime`.
4. **Create the entitlement.** *Entitlements* → *+ New* → identifier
   `premium` → attach the product.
5. **Create the offering.** *Offerings* → the default offering `default` →
   *+ Add package* → type **Lifetime** (identifier `$rc_lifetime`) → attach
   the product. Make sure `default` is marked **Current**.
6. **Copy the public SDK key.** Project settings → *API keys* → the iOS
   *Public app-specific API key* (starts with `appl_`). Never use a secret key
   in the app.
7. **Configure the webhook.** Project settings → *Integrations* → *Webhooks* →
   *+ New*.
   - URL: `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: `Bearer <REVENUECAT_WEBHOOK_SECRET>` (generate
     a long random string, e.g. `openssl rand -hex 32`, and keep it for the
     Supabase secret in section 4).
   - Environment: *Production* for the live project. If you want sandbox
     purchases to unlock content in a staging Supabase project, set
     `REVENUECAT_ALLOW_SANDBOX=true` there (never in production).
   - Events: leave all enabled.
8. Optional but recommended: Project settings → *Apps* → iOS app →
   *StoreKit 2* enabled (default for new projects).

## 4. Supabase

1. **Create the billing tables** if they do not exist yet. They are defined in
   `supabase.md`, section 6 (`revenuecat_customers`, `subscription_entitlements`,
   `revenuecat_events`) with the RLS policies in section 14. Run those
   statements in the SQL editor.
2. **Protect `user_plan` from clients.** The existing policy lets a member
   update their own profile row, which would also allow `user_plan`. Run:

   ```sql
   revoke update on public.app_users from authenticated;
   grant update (email, first_name, last_name, image_url,
                 nationality_country_code, residence_country_code,
                 preferred_language, onboarding_completed,
                 onboarding_completed_at, preferences)
     on public.app_users to authenticated;
   ```

   The service role used by the webhook is unaffected.
3. **Confirm the content RLS uses `user_plan`.** The deployed policies already
   hide `countries` / `country_documents` rows from `Free` members (that is why
   Free users used to see "Country not found"). Keep it that way; the app now
   shows the paywall instead of querying.
4. **Deploy the webhook function.** From the repo root:

   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<the string from step 3.7>
   supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```

   `--no-verify-jwt` is required because RevenueCat does not send a Supabase
   JWT; the function checks the `Authorization: Bearer <secret>` header instead.
5. **Test the webhook.** RevenueCat → Integrations → Webhooks → *Send test
   event* must return 200 and create a row in `revenuecat_events` with
   `event_type = 'TEST'`. Then run a sandbox purchase (section 6) and confirm
   `app_users.user_plan` becomes `PRO` for that Clerk user.

## 5. App configuration and builds

1. **Environment variables.** Add to `.env` (local) and to your EAS
   environment / secrets (`eas env:create` or the Expo dashboard):

   ```
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxx
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxx   # only when Android is set up
   ```

   Without the iOS key the Billing tab still renders, but "Buy Premium" shows
   the "Purchases unavailable" alert. This is intentional so a misconfigured
   build never crashes.
2. **Rebuild the native app.** `react-native-purchases` is a native module, so
   Expo Go cannot run this app and every existing dev client must be rebuilt:

   ```bash
   npx expo prebuild --platform ios --clean   # only if ios/ is stale
   npx expo run:ios --device <simulator or device>
   ```

   For store builds use EAS (`eas build --platform ios --profile production`).
3. **Optional: StoreKit configuration for the simulator.** In Xcode open
   `ios/EUWorkSupport.xcworkspace`, drag `store/EUWorkSupport.storekit` into the
   project (do not copy), then *Product → Scheme → Edit Scheme → Run → Options
   → StoreKit Configuration* → select the file. The simulator then shows the
   real payment sheet with a fake $59 product, no sandbox account needed. To
   keep it in sync with App Store Connect later, use *Editor → Sync with App
   Store Connect* on the file. RevenueCat still needs the product in its
   dashboard to return an offering; if it does not, the app falls back to
   loading the product by id.
4. **Do not commit `.env`.** `.env.example` documents the variables.

## 6. Testing checklist

- [ ] Simulator with the StoreKit configuration: Billing tab shows "$59.00",
      Buy Premium opens the sheet, confirming shows "Activating…" then
      "Welcome to Premium" (only when the webhook and Supabase are wired; with
      the StoreKit file alone the entitlement is granted locally, the plan
      stays Free and the "purchase found, activating" notice appears, which is
      expected).
- [ ] Real device, sandbox tester signed in under *Settings → App Store →
      Sandbox Account*: purchase succeeds, RevenueCat customer shows the
      entitlement, `app_users.user_plan = 'PRO'`, country pages open.
- [ ] Delete and reinstall the app, log in, tap **Restore purchase**: Premium
      comes back without paying again.
- [ ] Log in with the same Clerk account on a second device: Premium is
      active there too (RevenueCat user id = Clerk user id).
- [ ] Refund the sandbox purchase (RevenueCat customer page → *Refund* or
      App Store Connect sandbox refund): webhook sends `CANCELLATION` /
      `EXPIRATION`, `user_plan` returns to `Free`, paywall reappears.
- [ ] Airplane mode: Buy Premium shows a clear error toast, nothing hangs.
- [ ] Sign out: Billing tab asks the user to log in before buying.

## 7. App Review requirements (Guideline 3.1)

Already covered by the implementation; verify before submitting:

- Premium is sold only through In-App Purchase. Do not link to the website
  checkout from inside the app.
- The Billing tab shows the price, that it is a one-time payment, what it
  includes, a **Restore purchase** button, and links to Terms and Privacy Policy.
- Free users can still browse the Home tab; the paywall explains what Premium
  unlocks and never blocks login, account deletion or support.
- Submit the IAP product together with the binary the first time and mention
  in the review notes how to reach the paywall (any country card) and which
  test account is on the Free plan.
- Update the App Store privacy "nutrition label": Purchases are collected by
  RevenueCat (linked to identity, used for app functionality).

## 8. Android later

The code already reads `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. To sell on
Google Play: create the same product id as a one-time product in Play Console,
add the Android app in RevenueCat with the service-account JSON, attach the
product to the `premium` entitlement and the `default` offering, then set the
key. No app code changes are needed.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Purchases unavailable" alert | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` missing or the app was not rebuilt | Set the key, rebuild the dev client |
| "The Premium product is not available right now" | Paid Apps agreement not active, product not *Ready to Submit*, or product not attached to the RevenueCat offering | Check App Store Connect status, then the RevenueCat offering |
| Purchase succeeds but the app still says Free | Webhook not reaching Supabase, wrong secret, or event is `SANDBOX` in production | RevenueCat → Webhooks → check delivery log and response code; use *Send test event* |
| Webhook returns 401 | Authorization header does not match `REVENUECAT_WEBHOOK_SECRET` | Re-set the secret on both sides |
| Webhook returns 500 "Unable to upsert entitlement" | Billing tables missing or the unique constraint `(clerk_user_id, entitlement_id)` absent | Run section 6 of `supabase.md` |
| Restore says "Nothing to restore" | Different App Store account, or the sandbox purchase was on another Apple ID | Sign in with the purchasing Apple ID |
| Simulator shows no products | No StoreKit configuration selected in the scheme | Section 5.3 |
