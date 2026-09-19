# What you need to do (outside the code)

The app no longer asks anyone to register before buying Premium. That fixes
the September 18, 2026 rejection under Guideline 5.1.1(v). The code is on the
`fix/guest-premium-purchase` branch.

The steps below happen outside the code: Supabase, RevenueCat, App Store
Connect and testing. Do them in order. **Steps 1 to 3 are required.** Without
them, a reviewer who buys Premium without an account would still see
everything locked, and the app would be rejected again (this time under 2.1).

---

## What changed in the app (so you know what to test)

- **No sign-in before buying.**
  - Buy Premium and Restore purchase work without an account.
  - Anyone can open the Search, Saved and Profile tabs, every country page
    and every guide. People without Premium see the paywall, not a login
    wall.
- **Premium works without an account.**
  - A guest buys as RevenueCat's anonymous user, and Premium unlocks on that
    device straight away.
  - Content is locked by RLS to signed-in PRO members, so guests read it
    through a new Edge Function, `guest-premium`. That function checks the
    purchase with RevenueCat first.
- **The account is optional and can be created at any time.**
  - Profile (for guests) and Billing (after buying) show a "Use Premium on
    all your devices" card with **Create free account** and **Log in**.
  - When a guest signs up or logs in, their purchase and their saved items
    move into the account.
- **Guest saves stay on the device** until the guest creates an account.
- **Account screens still need an account:** account details, edit profile,
  change password, sign out and delete account. Account deletion is still in
  Profile → Delete account, which Apple requires.
- **Updated text:**
  - Billing and sign-in/sign-up screens.
  - The Terms, Privacy Policy and Data Deletion policy (in-app text, dated
    September 19, 2026).
  - Three new FAQ entries: no account needed, restoring, what an account
    adds.

---

## 1. Deploy the new Edge Function `guest-premium` (required)

Run these from the repo root. Your project ref is the subdomain in
`EXPO_PUBLIC_SUPABASE_URL` in `.env`, i.e. `https://<PROJECT_REF>.supabase.co`.

```bash
supabase login
supabase link --project-ref <PROJECT_REF>

# 1. Check which secrets already exist (values are hidden):
supabase secrets list

# 2. The guest function signs its access tokens with this. Generate it once:
supabase secrets set GUEST_ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)

# 3. Only if `REVENUECAT_SECRET_API_KEY` was NOT in the list above:
#    RevenueCat → Project settings → API keys → "+ New" → version V1 → copy the sk_… key.
#    (The appl_… public key cannot read customers. Never put sk_ in .env or EAS.)
supabase secrets set REVENUECAT_SECRET_API_KEY=sk_...

# 4. Deploy. --no-verify-jwt is required: guests have no login token at all.
supabase functions deploy guest-premium --no-verify-jwt
```

Check that it is live (use the publishable key from `.env`,
`EXPO_PUBLIC_SUPABASE_KEY`):

```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/guest-premium" \
  -H "apikey: <EXPO_PUBLIC_SUPABASE_KEY>" -H "content-type: application/json" \
  -d '{"action":"country","slug":"greece"}'
# Expected: {"error":"invalid_token"}      (it is deployed and refuses requests without a token)
# Wrong:    {"code":"NOT_FOUND",...}       (not deployed)
```

Optional offline test (no keys needed):
`deno test --allow-env --allow-read --allow-net supabase/tests/guest-premium.test.ts`

## 2. Make sure sandbox purchases unlock content (required for App Review)

App Review always buys in the **sandbox**, and so does TestFlight.

- If `REVENUECAT_ALLOW_SANDBOX` is not `true`, the reviewer's purchase goes
  through but the content stays locked. They see "sandbox (test) purchases
  are not enabled…", which means another rejection.
- Production App Store customers can never make sandbox purchases, so
  turning this on costs nothing.

```bash
supabase secrets set REVENUECAT_ALLOW_SANDBOX=true
```

The secret applies to all three functions (`guest-premium`,
`revenuecat-sync`, `revenuecat-webhook`), and secrets take effect without a
redeploy.

## 3. RevenueCat dashboard settings (required)

In RevenueCat → your project → **Project settings → General**:

1. **Restore behavior → "Transfer to new App User ID"** (the default).
   - Do **not** use "Keep with original App User ID". RevenueCat says that
     setting is only for apps that require an account before purchase.
   - With that setting, a guest who restores a purchase first made while
     logged in gets an error instead of Premium.
2. **Sandbox testing access → "Anybody"** (the default). "Allowed App User
   IDs only" or "Nobody" hides sandbox entitlements, and the reviewer's
   purchase would not unlock anything.

The webhook, the offering (`default` with the `$rc_lifetime` package) and the
`premium` entitlement need no changes.

## 4. Build and upload a new binary

- The rejected build was **4.2.3 (1)**.
  - `eas.json` uses `"appVersionSource": "remote"` and the production profile
    has no `autoIncrement`.
  - So either bump `"version"` in `app.json`, as you usually do (for example
    to `4.2.4`), or raise the build number with `eas build:version:set`.
  - Otherwise App Store Connect refuses a duplicate build number.
- Build and submit:

```bash
eas build -p ios --profile production
eas submit -p ios --profile production
```

## 5. Test on TestFlight before you resubmit

Use a real iPhone or iPad.

- Sign in a **fresh Sandbox Apple Account** under Settings → Developer →
  Sandbox Apple Account. Otherwise TestFlight uses your real Apple Account,
  which already owns Premium and cannot be reset.
- Start from a fresh install and **do not log in**.

- [ ] Home → tap any country → you see the paywall (not a login screen) →
      **Buy Premium** → the App Store sheet opens straight away → pay.
      "Welcome to Premium" appears, and the country page, guides, Search and
      Saved all work.
- [ ] Save a country and a guide, then kill and relaunch the app. Premium and
      the saves are still there, with no paywall flash.
- [ ] Profile tab (still logged out) shows "Guest", Premium, Settings, Saved,
      Legal and Support, plus the optional "Use Premium on all your devices"
      card.
- [ ] Delete and reinstall, still without logging in → Billing → **Restore
      purchase** → Premium comes back.
- [ ] Tap **Create free account** and finish sign-up. You may see a short
      loading state while the app moves the purchase into the account; then
      Premium stays active and your saves appear in the account.
      - If the account ends up on Free, tap Restore purchase once.
      - If that is needed, tell me: it means RevenueCat's merge or restore
        behaves differently in your project.
- [ ] Repeat with an **existing** account: buy as a guest on a fresh install,
      then log in to an account that already exists. Premium should also
      carry over. For accounts that already existed, the app does this with an
      automatic restore, and no prompt should appear.
- [ ] Log in with that account on a second device → Premium is active there.
- [ ] Sign out → the app becomes a Free guest, and Buy/Restore still work
      without logging in.
- [ ] Log in with an existing PRO test account → everything works as before.

Useful when checking:
- Supabase → Edge Functions → `guest-premium` → Logs should show "Premium
  active".
- In RevenueCat → Customers, turn on "View sandbox data". Guest customers
  have ids like `$RCAnonymousID:…`.

## 6. App Store Connect

1. **App Review Information → Notes.** Replace any "log in with the test
   account to buy" wording with something like:

   > Premium (non-consumable, eu_work_support_premium_lifetime) can be purchased and used
   > without creating an account. Launch the app without logging in, tap any country on
   > Home (or open the Billing tab) and tap Buy Premium. All country guides, guides,
   > Search and Saved unlock immediately on the device. Restore Purchases is on the Billing
   > tab and also works without an account. Creating an account is optional: the app
   > explains that an account lets users access Premium on their other devices and offers
   > sign-up at any time (Profile tab, and Billing after purchase). Account deletion is in
   > Profile → Delete account. The demo account below is only for the optional account features.

   You can still provide the demo account in the sign-in fields so the
   reviewer can check the optional account features. The notes above make
   clear that no sign-in is needed to buy or use Premium.

2. **The In-App Purchase's own review note.**
   - Go to In-App Purchases → Premium (Lifetime) → Review Information.
   - If it says to log in first, change it to "No account needed: open the
     Billing tab without logging in and tap Buy Premium."

3. **Description, promotional text and screenshots.** If any of them says
   users must create an account or sign up to get access, reword it. An
   account is now optional.

4. **Privacy policy / terms on your website.** The in-app Privacy Policy,
   Terms and Data Deletion text changed. Update the versions at your Privacy
   Policy URL (and Terms, if hosted) to match, because App Review reads the
   URL. The changes are:
   - Accounts are optional.
   - Guests get an anonymous purchase identifier.
   - Guest saves stay on the device.
   - Guests can request deletion by email with their purchase date or order
     ID.

5. **App Privacy (the nutrition label).** No new data types are collected, so
   the current answers stay valid:
   - Email Address, Name, User ID and Purchase History, all linked to the
     user, for App Functionality, with no tracking.
   - Guests get a RevenueCat anonymous ID, which Apple counts as a User ID;
     that type is already declared.

6. **Reply to App Review** in the Resolution Center (or App Review → the
   submission) when you resubmit, for example:

   > Hello, thank you for the feedback. We have revised the app so that registration is no
   > longer required to purchase or use the non-consumable In-App Purchase "EU Work Support
   > Premium". Users can browse the app, buy Premium and use all purchased content without
   > creating an account. Restore Purchases also works without an account. Account
   > registration is now optional: the app explains that an account lets users access their
   > Premium purchase on all of their supported devices, and users can register at any time
   > from the Profile tab (and from the Billing tab after purchasing). To test, launch the
   > app without logging in, tap any country or open the Billing tab, and tap Buy Premium.
   > Thank you.

## 7. Good to know (no action needed now)

- **Reinstalling without an account.** A guest who deletes the app and
  reinstalls gets a new anonymous id. They tap **Restore purchase** (same
  Apple Account) to get Premium back. The FAQ and Terms now say this. If they
  had created an account, logging in works too.
- **Refunds.** The guest access token is re-checked with RevenueCat once a
  day while the app is used, and it is dropped as soon as the device's store
  purchase disappears. A refunded guest therefore loses Premium within about
  a day.
- **Webhook `TRANSFER` events.**
  - RevenueCat sends `TRANSFER` events without an `app_user_id`.
    `revenuecat-webhook` answers those with 400 "Missing event" (this is not
    new).
  - Nothing in the guest flow depends on them.
  - If you want the webhook to record transfers (for example when a
    signed-out user restores a purchase that belonged to their account),
    that is a separate follow-up.
- **Supabase legacy API keys.**
  - Supabase plans to retire the legacy `anon` / `service_role` keys by the
    end of 2026.
  - `revenuecat-sync` and `revenuecat-webhook` still read
    `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
  - `guest-premium` already falls back to the new `SUPABASE_SECRET_KEYS`.
  - Plan to move the other two before then.
