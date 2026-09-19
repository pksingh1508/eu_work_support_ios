# Apple In-App Purchase (Premium, one-time $59)

This document explains how Premium is sold inside the app and every step you still
have to do outside the codebase. Follow the sections in order; each one depends on
the previous one.

## 1. How it works

**No account is needed to buy or use Premium** (App Store Review Guideline
5.1.1(v); the September 2026 review rejected a build that sent guests to
sign-in first). A guest buys as RevenueCat's anonymous user and Premium
unlocks on that device; creating an account is optional and only makes
Premium (and saved guides) available on the person's other devices.

Signed-in member:

```
User taps "Buy Premium"
  → react-native-purchases (RevenueCat SDK) shows the App Store payment sheet (StoreKit 2)
  → Apple charges the user's App Store account
  → RevenueCat validates the receipt and grants the `premium` entitlement
  → The app calls the Supabase Edge Function `revenuecat-sync`, which asks RevenueCat
    whether the entitlement is active and sets app_users.user_plan = 'PRO'
  → Independently, RevenueCat calls the Edge Function `revenuecat-webhook` for every
    new event (purchase, refund, transfer) and keeps user_plan in step later on
  → The app re-reads the profile and unlocks countries, guides, search and saves
```

Guest (not signed in):

```
User taps "Buy Premium" (no sign-in step)
  → RevenueCat SDK, as the anonymous user `$RCAnonymousID:…`, shows the App Store sheet
  → Apple charges the user's App Store account; RevenueCat grants `premium` to that anonymous id
  → The app calls the Edge Function `guest-premium` (action `session`), which asks
    RevenueCat's REST API whether that anonymous id owns `premium` and returns a
    signed access token (7 days, renewed daily)
  → Content RLS only admits PRO members, so the guest reads countries, guides, search and
    the country ids for saves through `guest-premium` with that token (service role on
    the server, same selects and filters as the member queries)
  → Saves stay on the device (MMKV) until the guest signs in, then they are copied to
    the account
  → If the guest later signs up or logs in, `Purchases.logIn(clerkUserId)` moves the
    purchase to the account (plus a restore when RevenueCat does not merge on its own,
    which happens for accounts that already have an anonymous alias), and
    `revenuecat-sync` sets user_plan = 'PRO'
```

Two server paths set `user_plan` on purpose. The webhook only fires for a
_new_ RevenueCat event, and RevenueCat creates none for a purchase it already
knows: buying the non-consumable again with the same Apple Account is Apple's
free re-download of the original transaction ("You've already purchased
this"), a restore that changes nothing sends nothing, and a webhook delivery
that failed is gone. `revenuecat-sync` therefore reads the customer straight
from RevenueCat's REST API whenever the app holds a confirmed purchase (after
Buy, after Restore, from "Already paid? Refresh status", and at launch when
the App Store account owns Premium but the profile still says Free). It only
ever upgrades; refunds still arrive as webhook `CANCELLATION` events.

Why RevenueCat instead of talking to StoreKit directly:

- Apple requires digital content to be sold through In-App Purchase (Guideline 3.1.1).
  RevenueCat wraps StoreKit 2 (products, purchase sheet, receipts, restores,
  refunds, Family Sharing) and gives you a dashboard and a webhook for free.
- Content access is enforced by Supabase Row Level Security through
  `app_users.user_plan`. The client never writes `user_plan`; only the two
  Edge Functions (service role) do, and `revenuecat-sync` grants it solely on
  RevenueCat's word. That makes the paywall impossible to bypass from a
  jailbroken device.

Identifiers used everywhere (keep them identical in every dashboard):

| Item                                  | Value                              |
| ------------------------------------- | ---------------------------------- |
| App Store product id (non-consumable) | `eu_work_support_premium_lifetime` |
| RevenueCat entitlement id             | `premium`                          |
| RevenueCat offering                   | `default` (current)                |
| RevenueCat package                    | Lifetime (`$rc_lifetime`)          |
| Price                                 | USD 59, one-time                   |
| iOS bundle id                         | `ios.euworksupport.app`            |

Apple derives the amount for every other storefront from that USD 59 price
point (App Store Connect price schedule) and charges the storefront of the
Apple Account signed into the App Store, never the device's location, IP
address or language. The app therefore never picks a price itself: it shows
StoreKit's `priceString` for that storefront, captions it with the storefront
name ("Price shown for the India App Store in INR"), and reloads it when the
storefront changes (`src/features/billing/storefront.ts`, `purchases.ts`).

What is already in the repo:

| Piece                                                                                     | Where                                                                                        |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SDK install (`react-native-purchases` 10.x)                                               | `package.json`, pods installed in `ios/`                                                     |
| SDK lifecycle: configure at launch, `logIn(clerkUserId)` / `logOut`, entitlement listener | `src/features/billing/purchases.ts`, `purchases-bridge.tsx` (mounted in `app-providers.tsx`) |
| Purchase / restore flow: server-side activation, webhook polling as fallback              | `src/features/billing/use-premium-purchase.ts`, `premium-sync.ts`                            |
| Billing tab UI, feature list, price, Restore, Terms/Privacy links                         | `src/features/billing/billing-screen.tsx`                                                    |
| Free-plan paywall + "Buy Premium" on country, guide, Search and Saved                     | `src/features/billing/paywall-card.tsx`, `premium-gate.ts`                                   |
| Webhook that mirrors purchases into Supabase and sets `user_plan`                         | `supabase/functions/revenuecat-webhook/index.ts`                                             |
| On-demand check: verifies the entitlement with RevenueCat's REST API and sets `user_plan` | `supabase/functions/revenuecat-sync/index.ts`                                                |
| StoreKit configuration for simulator testing                                              | `store/EUWorkSupport.storekit`                                                               |
| Env keys                                                                                  | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`               |

## 2. Apple Developer and App Store Connect

1. **Sign the Paid Apps agreement.** App Store Connect → Business → Agreements.
   Fill in banking, tax forms and contact info. Until this is "Active", products
   never load and StoreKit returns an empty list.
2. **Enable In-App Purchase on the App ID.** Apple Developer → Identifiers →
   `ios.euworksupport.app` → Capabilities → check _In-App Purchase_. Xcode adds
   the capability automatically when you archive with an App Store profile;
   no entitlement file is needed for StoreKit.
3. **Create the product.** App Store Connect → your app → _In-App Purchases_ →
   _+_ → **Non-Consumable**.
   - Reference name: `Premium (Lifetime)`
   - Product ID: `eu_work_support_premium_lifetime` (cannot be changed later)
   - Price schedule: pick the USD 59 price point; let Apple auto-generate other
     territories, or set them manually.
   - Localization (English at minimum): Display name `EU Work Support Premium`,
     description `Lifetime access to every country guide and document.`
   - Review information: upload a screenshot of the Billing tab (any device
     size) and add a review note such as "One-time purchase that unlocks all
     country guides. No account is needed: open the Billing tab (or any
     country) without logging in and tap Buy Premium." The product must show
     status **Ready to Submit**.
   - Availability: all territories where the app is sold.
4. **Attach the product to the next app version.** On the version page, section
   _In-App Purchases and Subscriptions_, add the product. Apple only reviews a
   product together with a binary the first time.
5. **Create an In-App Purchase API key** (StoreKit 2 server validation).
   App Store Connect → Users and Access → _Integrations_ → _In-App Purchase_ →
   _Generate_. Download the `.p8` once, note the Key ID and Issuer ID. You
   will upload it to RevenueCat.
6. **Create a sandbox tester.** Users and Access → _Sandbox_ → _Testers_ → _+_.
   Use a fresh email; on a test device sign into it under _Settings → App
   Store → Sandbox Account_. Never sign into the real App Store with it.

## 3. RevenueCat

1. Create a project at <https://app.revenuecat.com> named **EU Work Support**.
2. **Add the iOS app.** Project settings → _Apps_ → _+ New_ → App Store →
   bundle id `ios.euworksupport.app`. Under _In-App Purchase Key configuration_
   upload the `.p8` from step 2.5 with its Key ID and Issuer ID. Under
   _App-Specific Shared Secret_ paste the secret from App Store Connect →
   your app → _App Information_ → _App-Specific Shared Secret_ (needed for
   legacy receipt validation).
3. **Import the product.** _Products_ → _+ New_ (or _Import_) → store
   product `eu_work_support_premium_lifetime`.
4. **Create the entitlement.** _Entitlements_ → _+ New_ → identifier
   `premium` → attach the product.
5. **Create the offering.** _Offerings_ → the default offering `default` →
   _+ Add package_ → type **Lifetime** (identifier `$rc_lifetime`) → attach
   the product. Make sure `default` is marked **Current**.
6. **Copy the public SDK key.** Project settings → _API keys_ → the iOS
   _Public app-specific API key_ (starts with `appl_`). Never use a secret key
   in the app.
7. **Configure the webhook.** Project settings → _Integrations_ → _Webhooks_ →
   _+ New_.
   - URL: `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: `Bearer <REVENUECAT_WEBHOOK_SECRET>` (generate
     a long random string, e.g. `openssl rand -hex 32`, and keep it for the
     Supabase secret in section 4).
   - Environment: include **sandbox as well as production** events. Sandbox
     purchases (your sandbox testers, TestFlight users and Apple's reviewers)
     arrive with `environment: "SANDBOX"`, and the function ignores them
     unless the Supabase secret `REVENUECAT_ALLOW_SANDBOX=true` is set.
     Section 10.1 explains when to set it.
   - Events: leave all enabled.
8. Optional but recommended: Project settings → _Apps_ → iOS app →
   _StoreKit 2_ enabled (default for new projects).

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

5. **Deploy the sync function with a RevenueCat secret key.** RevenueCat →
   Project settings → _API keys_ → _+ New_ → name it (for example
   `supabase-sync`), version **V1**, _Generate_, copy the `sk_…` key. The
   `appl_…` public key cannot read customers. Then:

   ```bash
   supabase secrets set REVENUECAT_SECRET_API_KEY=sk_...
   supabase functions deploy revenuecat-sync --no-verify-jwt
   ```

   `--no-verify-jwt` is required here too: the app authenticates with a Clerk
   session token, which the Supabase gateway cannot verify. The function
   verifies that token itself by calling the Data API with it (Third-Party
   Auth), so a caller can only ever sync their own account. Never put the
   `sk_` key in `.env` or EAS: it can grant entitlements and delete
   customers. Without this function the app still works, but activation then
   depends on the webhook alone, which never fires for a repeated purchase
   (section 9).

6. **Test the webhook.** RevenueCat → Integrations → Webhooks → _Send test
   event_ must return 200 and create a row in `revenuecat_events` with
   `event_type = 'TEST'`. Then run a sandbox purchase (section 6) and confirm
   `app_users.user_plan` becomes `PRO` for that Clerk user.

7. **Deploy the guest function** (Premium without an account). It uses the
   same `REVENUECAT_SECRET_API_KEY` as step 5 plus its own token secret:

   ```bash
   supabase secrets set GUEST_ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
   supabase functions deploy guest-premium --no-verify-jwt
   ```

   `--no-verify-jwt` is required: guests send no user JWT at all. Without
   this function a guest's purchase succeeds but content stays locked (the
   app shows "We could not confirm it with our server yet"), which is exactly
   what App Review would see. `supabase/tests/guest-premium.test.ts` tests it
   offline (`deno test --allow-env --allow-read --allow-net supabase/tests/guest-premium.test.ts`).

## 5. App configuration and builds

1. **Environment variables.** Add to `.env` (local) and to your EAS
   environment / secrets (`eas env:create` or the Expo dashboard):

   ```
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxx
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxx   # only when Android is set up
   ```

   Without the iOS key the Billing tab still renders, but "Buy Premium" shows
   the "Purchases unavailable" alert. This is intentional so a misconfigured
   build never crashes. Keys that do not look like RevenueCat public keys
   (`appl_…`, `goog_…`, or `test_…` for the RevenueCat Test Store) are ignored
   with a console warning; the `pk_test…` placeholders currently in `.env`
   must be replaced.

2. **Rebuild the native app.** `react-native-purchases` is a native module, so
   Expo Go cannot run this app and every existing dev client must be rebuilt:

   ```bash
   npx expo prebuild --platform ios --clean   # only if ios/ is stale
   npx expo run:ios --device <simulator or device>
   ```

   For store builds use EAS (`eas build --platform ios --profile production`).

3. **Optional: StoreKit configuration for the simulator.**
   `store/EUWorkSupport.storekit` lets the simulator show the real payment
   sheet with a local $59 product and no Apple account. It only applies when
   the app is launched from Xcode with the file selected in the scheme, and
   RevenueCat can only validate those locally signed transactions after you
   upload the file's public certificate to the RevenueCat app settings.
   Section 10.3 has the exact steps. Without the file selected, the simulator
   talks to Apple's real sandbox and asks for an Apple Account at purchase
   time, which is not a supported path on the simulator.
4. **Do not commit `.env`.** `.env.example` documents the variables.

## 6. Testing checklist

- [ ] Simulator with the StoreKit configuration (section 10.3): Billing tab
      shows "$59.00", Buy Premium opens a sheet marked "[Environment: Xcode]",
      confirming shows "Activating…" then "Welcome to Premium". This needs the
      StoreKit certificate uploaded to RevenueCat and
      `REVENUECAT_ALLOW_SANDBOX=true`; otherwise the purchase fails with a
      receipt error, or the plan stays Free and the "purchase found,
      activating" notice appears.
- [ ] Real device, sandbox tester signed in (section 10.2): the sheet says
      "[Environment: Sandbox]", purchase succeeds, RevenueCat customer shows
      the entitlement, `app_users.user_plan = 'PRO'`, country pages open.
- [ ] Sandbox tester from another region (for example India or Poland):
      Billing tab, paywall cards and the Profile row show that storefront's
      currency, and the caption under the hero price names the region.
- [ ] Buy again with the same Apple Account after resetting `user_plan` to
      `Free` (section 10.2 step 7): Apple says "You've already purchased
      this", RevenueCat records nothing new and sends no event, and the app
      still ends on "Welcome to Premium" because `revenuecat-sync` read the
      entitlement from RevenueCat (Supabase → Edge Functions →
      `revenuecat-sync` → Logs shows "Premium active").
- [ ] Delete and reinstall the app, log in, tap **Restore purchase**: Premium
      comes back without paying again.
- [ ] Log in with the same Clerk account on a second device: Premium is
      active there too (RevenueCat user id = Clerk user id).
- [ ] Refund the sandbox purchase (RevenueCat customer page → _Refund_ or
      App Store Connect sandbox refund): webhook sends `CANCELLATION` /
      `EXPIRATION`, `user_plan` returns to `Free`, paywall reappears.
- [ ] Airplane mode: Buy Premium shows a clear error toast, nothing hangs.
- [ ] Fresh install, **no account**: open a country (paywall) → Buy Premium →
      the App Store sheet opens straight away (no sign-in step), "Welcome to
      Premium" follows, and countries, guides, Search and Saved all work.
      Kill and relaunch: still Premium, no paywall flash.
- [ ] Still without an account, save a country and a guide, then create an
      account from Profile or Billing: Premium stays active and the saves
      appear in the account.
- [ ] Second device (or reinstall), no account: Restore purchase unlocks
      Premium. Logging in to the account from the previous step also does.
- [ ] Sign out: the app becomes a Free guest; Buy Premium and Restore
      purchase still work without logging in.

## 7. App Review requirements (Guidelines 3.1 and 5.1.1(v))

Already covered by the implementation; verify before submitting:

- **No registration before purchase (5.1.1(v)).** Buy Premium and Restore
  purchase work without an account, and every screen Premium unlocks works
  for a guest. The app explains that an account is optional and only adds
  access on other devices, and offers sign-up at any time (Profile tab, the
  Billing tab after buying). Account deletion stays in Profile → Delete
  account for people who create one.
- `guest-premium` is deployed and `REVENUECAT_ALLOW_SANDBOX=true` is set:
  reviewers buy in the sandbox, without an account.
- Premium is sold only through In-App Purchase. Do not link to the website
  checkout from inside the app.
- The Billing tab shows the price, that it is a one-time payment, what it
  includes, a **Restore purchase** button, and links to Terms and Privacy Policy.
- Free users can still browse the Home tab; the paywall explains what Premium
  unlocks and never blocks login, account deletion or support.
- Submit the IAP product together with the binary the first time and mention
  in the review notes how to reach the paywall (any country card) and that no
  account is needed to buy. Keep a demo account in the review information for
  the optional account features.
- Update the App Store privacy "nutrition label": Purchases are collected by
  RevenueCat (linked to identity, used for app functionality).

## 8. Android later

The code already reads `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. To sell on
Google Play: create the same product id as a one-time product in Play Console,
add the Android app in RevenueCat with the service-account JSON, attach the
product to the `premium` entitlement and the `default` offering, then set the
key. No app code changes are needed.

## 9. Troubleshooting

| Symptom                                                                                                      | Likely cause                                                                                                            | Fix                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| "Purchases unavailable" alert                                                                                | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` missing, not an `appl_…` key, or the app was not rebuilt                           | Set the real public key, rebuild the dev client                                                                                   |
| Red "[RevenueCat] There was a credential issue" box in development                                           | The key is present but rejected by RevenueCat (wrong project or a secret key)                                           | Copy the _public app-specific_ key from Project settings → API keys                                                               |
| "The Premium product is not available right now"                                                             | Paid Apps agreement not active, product not _Ready to Submit_, or product not attached to the RevenueCat offering       | Check App Store Connect status, then the RevenueCat offering                                                                      |
| Purchase succeeds but the app still says Free                                                                | Webhook not reaching Supabase, wrong secret, or event is `SANDBOX` in production                                        | RevenueCat → Webhooks → check delivery log and response code; use _Send test event_                                               |
| Webhook returns 401                                                                                          | Authorization header does not match `REVENUECAT_WEBHOOK_SECRET`                                                         | Re-set the secret on both sides                                                                                                   |
| Webhook returns 500 "Unable to upsert entitlement"                                                           | Billing tables missing or the unique constraint `(clerk_user_id, entitlement_id)` absent                                | Run section 6 of `supabase.md`                                                                                                    |
| Restore says "Nothing to restore"                                                                            | Different App Store account, or the sandbox purchase was on another Apple ID                                            | Sign in with the purchasing Apple ID                                                                                              |
| Billing tab shows `$59.00` although the phone is in India, Poland, …                                         | Apple prices for the storefront of the Apple Account or sandbox tester signed into the App Store, never for the device's location or IP; the tester from 10.1 and the `.storekit` file are United States | Sign in a sandbox tester created for that region (10.1); the caption under the price names the storefront in use                 |
| Simulator shows no products                                                                                  | No StoreKit configuration selected in the scheme                                                                        | Section 10.3                                                                                                                      |
| Simulator shows "Sign in to Apple Account" when tapping Buy Premium                                          | No StoreKit configuration selected, so the simulator went to Apple's real sandbox, which Apple only supports on devices | Cancel, then use section 10.3 (simulator) or 10.2 (device)                                                                        |
| Red "[RevenueCat] 🍎‼️ Purchase was cancelled." console error after Cancel                                   | The SDK logs a dismissed sheet at ERROR level and its default handler calls `console.error`                             | Fixed: `purchases.ts` registers its own log handler before `configure()`, drops cancellations and downgrades the rest to warnings |
| Purchase succeeds but the app shows "Your App Store purchase was found. Premium is being activated…" forever | The event was `SANDBOX` and `REVENUECAT_ALLOW_SANDBOX` is unset, or the RevenueCat webhook only sends production events | Section 10.1; then tap _Already paid? Refresh status_ (runs `revenuecat-sync`)                                                    |
| "Payment confirmed. Activating…" runs for 15 s, then "Payment received … within a few minutes"; RevenueCat shows no new transaction and Supabase gets no new `revenuecat_events` row | The Apple Account already owned the product from an earlier test. TestFlight buys in the sandbox with the production Apple Account unless a Sandbox Apple Account is signed in (10.2), and a production account's purchase history cannot be cleared. Apple's "You've already purchased this" is a free re-download of the original transaction, so RevenueCat has nothing new to record and sends no webhook event, and the old flow waited for that event alone | Deploy `revenuecat-sync` (section 4.5): it activates from RevenueCat's customer record without an event. To watch a first-time purchase again, sign in a fresh Sandbox Apple Account or clear the tester's purchase history |
| RevenueCat → Customers shows no transactions at all                                                          | The _View sandbox data_ toggle in the top bar is off, so sandbox purchases are hidden                                   | Turn it on, then open the customer with the Clerk user id (`user_…`)                                                              |
| "Sandbox purchase found … not enabled to unlock content on this server"                                      | `revenuecat-sync` saw an active entitlement whose purchase is sandbox, and `REVENUECAT_ALLOW_SANDBOX` is not `true`     | Section 10.1 step 2                                                                                                               |
| "Already paid? Refresh status" says "Not active yet" although RevenueCat shows the entitlement               | `revenuecat-sync` is not deployed, or `REVENUECAT_SECRET_API_KEY` is missing / not a V1 secret key (function log shows `sync_not_configured` or `revenuecat_unauthorized`) | Section 4.5                                                                                                                       |
| "Purchase failed" with a receipt or "invalid" message on the simulator with the StoreKit file                | The StoreKit public certificate is not uploaded to RevenueCat                                                           | Section 10.3, step 4                                                                                                              |
| Guest (not logged in) buys, then "We could not confirm it with our server yet" and content stays locked      | `guest-premium` is not deployed (HTTP 404 in the dev log), or `REVENUECAT_SECRET_API_KEY` is missing (503 `not_configured`) | Section 4.7                                                                                                                       |
| Guest buys, then "Your purchase is confirmed, but sandbox (test) purchases are not enabled…"                  | `REVENUECAT_ALLOW_SANDBOX` is not `true`                                                                                | Section 10.1 step 2                                                                                                               |
| Guest created an account after buying, but the account shows the Free plan                                  | RevenueCat did not merge the anonymous purchase (the account already had an anonymous alias) and the automatic restore failed | Billing → Restore purchase while logged in; RevenueCat's restore behavior must be _Transfer to new App User ID_                    |

## 10. Sandbox purchase test, step by step

### Simulator or a real iPhone?

| You want to                                                                               | Use                                            | Apple account  | What it proves                                                                                 |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| Click through the paywall, the payment sheet and the "Welcome to Premium" flow quickly    | Simulator + StoreKit configuration file (10.3) | None           | UI and app logic. RevenueCat validates the local transaction once its certificate is uploaded. |
| The real end-to-end test: App Store → RevenueCat → webhook → Supabase `user_plan = 'PRO'` | Physical iPhone + sandbox tester (10.2)        | Sandbox tester | Exactly what App Review will do. Run it at least once before submitting.                       |
| The RevenueCat and webhook chain from the simulator with zero App Store setup             | Simulator + RevenueCat Test Store key (10.4)   | None           | Backend wiring, not Apple.                                                                     |

The "Sign in to Apple Account" dialog you saw on the simulator means the app
got further than you might think: the product loaded from App Store Connect
(so the Paid Apps agreement, the product and the RevenueCat offering are
fine) and StoreKit asked for an account to charge. Apple only documents the
sandbox for real devices (development-signed builds and TestFlight). On the
simulator that dialog is unreliable (repeated prompts, "Cannot connect to
App Store"), so do not type the sandbox tester into it. Tap Cancel (the app
treats that as "no purchase" and stays quiet) and use one of the routes below.

### 10.1 One-time preparation (needed for every route)

1. **Create a sandbox tester.** App Store Connect → Users and Access →
   _Sandbox_ → _Testers_ → _+_. Use an email that is not already an Apple
   Account (a Gmail `+sandbox` alias works) and write the password down; it
   cannot be recovered. Never sign into the real App Store with it.

   The tester's **region is the App Store storefront**, and that alone decides
   the currency and amount the app shows: United States gives `$59.00`,
   Poland `249,99 zł`, India Apple's INR price point. The phone's location,
   SIM, IP address or language change nothing, so a tester created with
   region United States shows `$59.00` in India too. Create one tester per
   region you want to see.
2. **Let sandbox events unlock content.** Every sandbox, TestFlight, Test
   Store _and App Review_ purchase reaches the webhook with
   `environment: "SANDBOX"`, and `revenuecat-webhook`, `revenuecat-sync` and
   `guest-premium` ignore those unless this secret is set:

   ```bash
   supabase secrets set REVENUECAT_ALLOW_SANDBOX=true
   ```

   Secrets apply without a redeploy; if the next event still shows
   `ignored: "sandbox event"` in the RevenueCat delivery log, run
   `supabase functions deploy revenuecat-webhook --no-verify-jwt` once more.
   Also open RevenueCat → Integrations → Webhooks → your webhook and make sure
   _Environment_ includes sandbox, not production only.

   Keep the secret on at least until Apple approves the app: reviewers buy
   with a sandbox account, and if their purchase never unlocks content the
   IAP is rejected. Leaving it on permanently is low risk, because only
   sandbox testers you create (and Apple) can produce sandbox events for
   this app.

3. **Pick the route to test.** App Review buys **without an account**, so
   always run the guest route (no login at all). The member route is
   optional: log into the app with a Clerk account whose
   `app_users.user_plan` is `Free` (check in the Supabase table editor), so
   you can watch it flip to `PRO`.

### 10.2 Route A: physical iPhone + sandbox tester (the real test)

Requirements: an iPhone on iOS 16 or newer, a USB cable, _Developer Mode_
enabled on the phone (Settings → Privacy & Security → Developer Mode, then
restart), and Xcode signed into your Apple Developer team (Xcode → Settings →
Accounts).

1. **Install the development build on the phone.**

   ```bash
   npx expo run:ios --device
   ```

   Pick the iPhone in the list. Xcode's automatic signing registers the
   device and creates a development profile. If it fails with a signing
   error, open `ios/EUWorkSupport.xcworkspace`, select the _EUWorkSupport_
   target → _Signing & Capabilities_ → choose your Team, then run the command
   again. Leave Metro running; the phone must be on the same Wi-Fi as the Mac.
   `ios/` is not committed, so this selection is local and is lost after
   `npx expo prebuild --clean`.

   No cable? Register the phone once with `eas device:create`, build with
   `eas build --profile development --platform ios`, install it from the link
   EAS prints, then start `npx expo start` and open the project from the dev
   client.

2. **Sign into the sandbox on the phone.** iOS 18 and newer: Settings →
   _Developer_ → _Sandbox Apple Account_ → _Sign In_ with the tester from
   10.1. iOS 13 to 17: Settings → _App Store_ → _Sandbox Account_. If the row
   is missing, skip this step: the phone asks you to sign in the first time
   you tap Buy Premium, and you enter the sandbox tester there (never your
   real Apple ID). After that the row appears and shows
   "[Environment: Sandbox]".
3. **Buy.** Guest route: do not log in, just open the Billing tab (or any
   country's paywall). Member route: log in with the Free test account first,
   then open the Billing tab. The price should read `$59.00` for a United States tester; a tester in another
   region sees that storefront's price instead (for example `249,99 zł` for
   Poland). The app never hardcodes a price: it shows Apple's `priceString`
   for the exact RevenueCat package it will purchase, a spinner while that
   loads, and an error with "Try again" if offerings cannot be fetched. The
   caption under the price ("Price shown for the United States App Store in
   USD") names the storefront StoreKit is using; if it is not the region you
   expected, the sandbox tester signed into Settings, or, before any sandbox
   sign-in, the Apple Account under Settings → Media & Purchases, belongs to
   another region. Tap **Buy Premium**. The sheet is labelled
   "[Environment: Sandbox]"; confirm with Face ID or the tester password.
   Nothing is charged.
4. **Watch the activation.** The button shows "Payment confirmed. Activating
   your Premium access…". As a guest the app asks `guest-premium` to confirm
   the purchase and gets "Welcome to Premium … unlocked on this device";
   "We could not confirm it with our server yet" means that function is not
   deployed or cannot reach RevenueCat (section 4.7). As a member the app asks
   `revenuecat-sync` to verify the purchase with RevenueCat (about a second)
   and, only if that function is not deployed, polls the profile for 15
   seconds waiting for the webhook. You should get the "Welcome to Premium"
   toast and the country pages open. If you get "Payment received … will
   appear within a few minutes" instead, neither path flipped the plan; go
   to step 5.
5. **Verify the chain.**
   - Guest route: RevenueCat → _Customers_ (with _View sandbox data_ on) →
     the newest `$RCAnonymousID:…` customer has the active `premium`
     entitlement, and Supabase → Edge Functions → `guest-premium` → Logs shows
     "Premium active". Nothing is written to Supabase tables for a guest.
   - Member route: RevenueCat → _Customers_ → search the Clerk user id
     (`user_…`): the `premium` entitlement is active and marked sandbox.
   - RevenueCat → _Integrations_ → _Webhooks_ → delivery log: the
     `NON_RENEWING_PURCHASE` event returned `200` (a body containing
     `ignored` means step 10.1.2 is missing).
   - Supabase: a row in `revenuecat_events`, a row in
     `subscription_entitlements`, and `app_users.user_plan = 'PRO'`.
   - Supabase → Edge Functions → `revenuecat-sync` → Logs: "Premium active"
     for the Clerk user id (or the reason it declined).
6. **Restore.** Delete the app, install it again and tap **Restore
   purchase** without logging in (guest) → Premium comes back with no
   payment. Member route: log in with the same Clerk account instead; Premium
   is active straight away, and Restore purchase also works.
   Buying the same product again shows Apple's "You've already purchased
   this" sheet, which is correct for a non-consumable: Apple re-delivers the
   original transaction for free, RevenueCat records nothing new and sends no
   webhook event, and the app still activates through `revenuecat-sync`.
7. **Reset for another run.** App Store Connect → Users and Access →
   _Sandbox_ → _Testers_ → your tester → _Clear Purchase History_; delete the
   customer in RevenueCat (_Customers_ → the `$RCAnonymousID:…` guest or the
   `user_…` member → _Delete_); for the member route, in the Supabase SQL
   editor:

   ```sql
   update public.app_users set user_plan = 'Free'
   where clerk_user_id = 'user_xxxxxxxx';
   ```

   Then delete the app from the phone and install it again. _Clear Purchase
   History_ exists only for sandbox testers: a production Apple Account keeps
   its sandbox purchase forever, so every later Buy from it is a re-download
   (no new RevenueCat transaction, no webhook event). To watch a first-time
   purchase again, create a new sandbox tester.

TestFlight builds always run in the sandbox, but they buy with the production
Apple Account signed into _Settings → your name → Media & Purchases_ unless
you sign that account out there and sign a sandbox tester in under _Settings
→ Developer → Sandbox Apple Account_ (Apple's documented TestFlight
procedure). Do that before the first Buy: the production account's sandbox
purchase cannot be cleared afterwards. Same checks as above.

### 10.3 Route B: simulator + StoreKit configuration file

The `.storekit` file is applied by Xcode when it launches the app, so this
route needs Xcode's Run button, not `npx expo run:ios`.

1. Start Metro in a terminal: `npx expo start`. Then `open
ios/EUWorkSupport.xcworkspace` (run `npx expo prebuild --platform ios`
   first if the folder is missing).
2. In Xcode: File → _Add Files to "EUWorkSupport"…_ → pick
   `store/EUWorkSupport.storekit`, untick _Copy items if needed_, no target
   membership. Do this again after every `prebuild --clean`; `ios/` is
   not committed.
3. Product → Scheme → _Edit Scheme…_ → _Run_ → _Options_ → _StoreKit
   Configuration_ → `EUWorkSupport.storekit` → Close.
4. Upload the certificate so RevenueCat accepts the local transactions:
   select the `.storekit` file in Xcode → _Editor_ → _Save Public
   Certificate…_ → save it anywhere → RevenueCat → Project settings → _Apps_
   → the iOS app → expand _StoreKit testing framework_ → upload the `.cer`.
   Skip this and the purchase fails with a receipt error.
5. Press ▶︎ in Xcode with an iPhone simulator selected. The debug build
   connects to the Metro you started in step 1.
6. Log in with the Free test account → Billing → **Buy Premium**. The sheet
   shows `$59.00` and "[Environment: Xcode]" and asks for no Apple account.
   Confirm. RevenueCat validates the transaction, the webhook receives a
   sandbox event, and with `REVENUECAT_ALLOW_SANDBOX=true` the plan flips to
   `PRO` and the "Welcome to Premium" toast appears.

   The simulator prices for the file's _Default Storefront_ (select the
   `.storekit` file in Xcode → _Editor_ → _Default Storefront_), which is
   United States, so the Billing tab says "Price shown for the United States
   App Store in USD" whatever the Mac's region. Switching the storefront only
   changes the currency of the one local `59.00` price; a file created with
   _Sync this file with an app in App Store Connect_ carries Apple's real
   amount per territory. For another region's true price use a device with
   a sandbox tester from that region (10.1).
7. To buy again: Xcode → _Debug_ → _StoreKit_ → _Manage Transactions…_ →
   select the transaction → delete or refund it, and reset the RevenueCat
   customer and `user_plan` as in 10.2 step 7.

### 10.4 Route C: RevenueCat Test Store (optional, simulator, no Apple setup)

1. RevenueCat → Project settings → _Apps and providers_ → _Test
   configuration_ → create a Test Store and copy its `test_…` API key.
2. Under that Test Store add a product with id
   `eu_work_support_premium_lifetime` (one-time purchase, price 59 USD) and
   attach it to the `premium` entitlement and the `default` offering, the
   same way as the App Store product in section 3.
3. In `.env` set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=test_…` and restart
   Metro with `npx expo start --clear`. No native rebuild is needed; the key
   is inlined into the JS bundle.
4. Tap **Buy Premium**: RevenueCat shows its own test purchase sheet, records
   the purchase as sandbox data, and the webhook and Supabase steps run
   exactly as in 10.2 step 5.
5. Put the `appl_…` key back before any TestFlight or App Store build. Never
   ship a `test_` key.

### 10.5 Before you submit

- `.env` and the EAS production environment hold the `appl_…` key.
- `REVENUECAT_ALLOW_SANDBOX=true` stays set through App Review (10.1.2).
- `REVENUECAT_SECRET_API_KEY` is set and `revenuecat-sync` is deployed
  (section 4.5), so a reviewer whose sandbox account already bought the
  product in an earlier review still gets Premium.
- `guest-premium` is deployed with `GUEST_ACCESS_TOKEN_SECRET` (section 4.7),
  so a reviewer who buys **without an account** gets Premium.
- RevenueCat → Project settings → _Restore behavior_ is _Transfer to new App
  User ID_ (not _Keep with original App User ID_, which RevenueCat only allows
  for apps that require an account before purchase), and _Sandbox testing
  access_ is _Anybody_.
- The RevenueCat webhook sends both sandbox and production events.
- The StoreKit configuration file only affects Xcode runs; App Store and
  TestFlight builds ignore it, so nothing needs to be removed.
