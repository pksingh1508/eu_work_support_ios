# Supabase Schema And RLS Plan

Last reviewed: 2026-04-18

This document defines the initial Supabase database for the Europe visa and immigration mobile app. It assumes Clerk is the source of authentication and Supabase uses Clerk as a third-party auth provider. User-owned rows use the Clerk user ID stored as `text`, and RLS checks use `auth.jwt()->>'sub'`.

## 1. Design Principles

- Clerk owns authentication.
- Supabase stores application data, public immigration content, saved items, billing mirrors, notification preferences, and support requests.
- Public content is readable by anonymous and authenticated users only when published.
- User data is readable and writable only by the owner.
- Billing/subscription tables are readable by the owner but written only by trusted webhook handlers.
- Service-role key is used only in Supabase Edge Functions or trusted backend jobs.
- All public-schema tables have RLS enabled.

## 2. Extensions, Helpers, And Triggers

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt()->>'sub', '');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

## 3. Core User Tables

```sql
create table public.app_users (
  clerk_user_id text primary key default public.current_clerk_user_id(),
  email text,
  first_name text,
  last_name text,
  image_url text,
  nationality_country_code char(2),
  residence_country_code char(2),
  preferred_language text default 'en',
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  preferences jsonb not null default '{}'::jsonb,
  clerk_created_at timestamptz,
  clerk_updated_at timestamptz,
  user_plan text default 'Free',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create table public.user_onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  goal text not null check (goal in ('visit', 'work', 'study', 'family', 'business', 'relocate', 'other')),
  nationality_country_code char(2),
  residence_country_code char(2),
  destination_country_ids uuid[] not null default '{}',
  notification_opt_in boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_onboarding_answers_set_updated_at
before update on public.user_onboarding_answers
for each row execute function public.set_updated_at();

create index user_onboarding_answers_user_idx
on public.user_onboarding_answers(clerk_user_id);
```

## 4. Country And Document Content Tables

The country content should be stored as flexible documents, not as one rigid set of visa-specific tables. Each country can have many different document types, such as work visa, student visa, driving licence, insurance companies, university list, AMKA/social security, sworn translation, CV guide, residence permit, and any future country-specific topic.

Use `country_documents.content_json` for the document body. This keeps highly different document shapes in one stable table while still allowing structured rendering in the mobile app.

Recommended `content_json` section types:

- `hero`: introductory title and paragraph.
- `quick_answer`: short answer blocks.
- `paragraph`: normal text.
- `bullet_list`: unordered points.
- `numbered_steps`: ordered process steps.
- `checklist`: required items.
- `table`: columns and rows like the Word docs in the screenshot.
- `warning`: important do/don't or risk note.
- `callout`: highlighted guidance.
- `faq`: question and answer list.
- `source_links`: official links.

Example body shape:

```json
{
  "sections": [
    {
      "type": "hero",
      "title": "What is a Greece Work Visa?",
      "content": "A Greece Work Visa allows you to enter Greece legally for work."
    },
    {
      "type": "bullet_list",
      "title": "Who Can Apply?",
      "items": [
        "People with a job offer",
        "Applicants with a valid passport",
        "People meeting embassy requirements"
      ]
    },
    {
      "type": "table",
      "title": "Employer Documents",
      "columns": ["Document", "Explanation"],
      "rows": [
        ["Job contract", "Signed job agreement"],
        ["Employer approval letter", "Permission from Greek authority"]
      ]
    }
  ]
}
```

```sql
create table public.countries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  code text not null unique,
  iso2 char(2) unique,
  iso3 char(3) unique,
  flag_url text,
  flag_emoji text,
  flag_asset_key text,
  is_active boolean not null default true,
  region text,
  subregion text,
  is_eu boolean not null default false,
  is_eea boolean not null default false,
  is_schengen boolean not null default false,
  capital text,
  currency_code char(3),
  official_language_codes text[] not null default '{}',
  popularity_rank int,
  short_description text,
  official_immigration_url text,
  last_reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger countries_set_updated_at
before update on public.countries
for each row execute function public.set_updated_at();

create index countries_active_rank_idx
on public.countries(is_active, popularity_rank nulls last);

create index countries_name_trgm_idx
on public.countries using gin (name gin_trgm_ops);

create table public.country_aliases (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  alias text not null,
  locale text default 'en',
  created_at timestamptz not null default now()
);

create unique index country_aliases_unique_lower_alias_idx
on public.country_aliases(country_id, lower(alias), coalesce(locale, ''));

create index country_aliases_alias_trgm_idx
on public.country_aliases using gin (alias gin_trgm_ops);

create table public.document_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  description text,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger document_categories_set_updated_at
before update on public.document_categories
for each row execute function public.set_updated_at();

create table public.country_documents (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  category_id uuid not null references public.document_categories(id) on delete cascade,
  title text not null,
  slug text not null,
  short_description text,
  intro text,
  content_json jsonb not null default '{"sections":[]}'::jsonb,
  language text not null default 'en',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  is_premium boolean not null default false,
  tags text[] not null default '{}',
  sort_order int not null default 100,
  seo_title text,
  seo_description text,
  source_url text,
  last_reviewed_at date,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_id, category_id, slug, language),
  check (jsonb_typeof(content_json) = 'object'),
  check (
    not (content_json ? 'sections')
    or jsonb_typeof(content_json->'sections') = 'array'
  )
);

create trigger country_documents_set_updated_at
before update on public.country_documents
for each row execute function public.set_updated_at();

create or replace function public.set_country_document_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text = lower(
    coalesce(new.title, '') || ' ' ||
    coalesce(new.short_description, '') || ' ' ||
    coalesce(new.intro, '') || ' ' ||
    array_to_string(new.tags, ' ') || ' ' ||
    new.content_json::text
  );
  return new;
end;
$$;

create trigger country_documents_set_search_text
before insert or update of title, short_description, intro, tags, content_json
on public.country_documents
for each row execute function public.set_country_document_search_text();

create index country_documents_country_status_idx
on public.country_documents(country_id, status, sort_order);

create index country_documents_category_idx
on public.country_documents(category_id, status);

create index country_documents_language_idx
on public.country_documents(language);

create index country_documents_search_trgm_idx
on public.country_documents using gin (search_text gin_trgm_ops);

create index country_documents_tags_idx
on public.country_documents using gin (tags);

create index country_documents_content_json_idx
on public.country_documents using gin (content_json jsonb_path_ops);

create table public.document_sources (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.country_documents(id) on delete cascade,
  title text not null,
  url text not null,
  link_type text not null default 'official',
  notes text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create index document_sources_document_idx
on public.document_sources(document_id, sort_order);
```

Starter document categories:

```sql
insert into public.document_categories (slug, name, icon, sort_order)
values
  ('work-visa', 'Work Visa', 'briefcase', 10),
  ('student-visa', 'Student Visa', 'graduation-cap', 20),
  ('tourist-visa', 'Tourist Visa', 'passport', 30),
  ('residence-permit', 'Residence Permit', 'id-card', 40),
  ('social-security', 'Social Security', 'shield-check', 50),
  ('driving-licence', 'Driving Licence', 'car', 60),
  ('health-insurance', 'Health Insurance', 'heart-pulse', 70),
  ('education', 'Education', 'book-open', 80),
  ('translation', 'Translation', 'languages', 90),
  ('cv-and-jobs', 'CV and Jobs', 'file-text', 100)
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
```

Example country document insert:

```sql
insert into public.country_documents (
  country_id,
  category_id,
  title,
  slug,
  short_description,
  intro,
  content_json,
  tags,
  status,
  published_at,
  last_reviewed_at
)
select
  c.id,
  dc.id,
  'Greece Work Visa',
  'greece-work-visa',
  'Complete guide for Greece work visa process and required documents',
  'A practical country document for people applying to work in Greece.',
  '{
    "sections": [
      {
        "type": "hero",
        "title": "What is a Greece Work Visa?",
        "content": "A Greece Work Visa allows you to enter Greece legally for work."
      },
      {
        "type": "quick_answer",
        "title": "Quick Answer",
        "items": [
          "You usually need a Greek employer approval first.",
          "You apply at the Greek Embassy in your home country.",
          "After arrival, you apply for a residence permit."
        ]
      },
      {
        "type": "bullet_list",
        "title": "Who Can Apply?",
        "items": [
          "People with a job offer",
          "Applicants with a valid passport",
          "People meeting embassy requirements"
        ]
      },
      {
        "type": "table",
        "title": "Employer Documents",
        "columns": ["Document", "Explanation"],
        "rows": [
          ["Job contract", "Signed job agreement"],
          ["Employer approval letter", "Permission from Greek authority"],
          ["Proof of accommodation", "Paper saying you have a place to stay in Greece"]
        ]
      },
      {
        "type": "warning",
        "title": "Important",
        "content": "Without the employer approval, you usually cannot apply for the work visa."
      }
    ]
  }'::jsonb,
  array['greece', 'work', 'visa', 'documents'],
  'published',
  now(),
  current_date
from public.countries c
join public.document_categories dc on dc.slug = 'work-visa'
where c.slug = 'greece'
on conflict (country_id, category_id, slug, language) do update
set
  title = excluded.title,
  short_description = excluded.short_description,
  intro = excluded.intro,
  content_json = excluded.content_json,
  tags = excluded.tags,
  status = excluded.status,
  published_at = excluded.published_at,
  last_reviewed_at = excluded.last_reviewed_at;
```

## 5. Saved Items, Search, Feedback, And Support

```sql
create table public.saved_countries (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(clerk_user_id, country_id)
);

create index saved_countries_user_idx
on public.saved_countries(clerk_user_id, created_at desc);

create table public.saved_documents (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  document_id uuid not null references public.country_documents(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id, document_id)
);

create trigger saved_documents_set_updated_at
before update on public.saved_documents
for each row execute function public.set_updated_at();

create index saved_documents_user_idx
on public.saved_documents(clerk_user_id, created_at desc);

create table public.recently_viewed_documents (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  document_id uuid not null references public.country_documents(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(clerk_user_id, document_id)
);

create index recently_viewed_documents_user_idx
on public.recently_viewed_documents(clerk_user_id, viewed_at desc);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  query text not null,
  filters jsonb not null default '{}'::jsonb,
  result_count int,
  created_at timestamptz not null default now()
);

create index search_history_user_idx
on public.search_history(clerk_user_id, created_at desc);

create table public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text references public.app_users(clerk_user_id) on delete set null,
  country_id uuid references public.countries(id) on delete set null,
  document_id uuid references public.country_documents(id) on delete set null,
  feedback_type text not null check (feedback_type in ('correction', 'outdated', 'missing', 'helpful', 'other')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_feedback_set_updated_at
before update on public.content_feedback
for each row execute function public.set_updated_at();

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  subject text not null,
  message text not null,
  category text not null default 'general',
  status text not null default 'open' check (status in ('open', 'waiting', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger support_requests_set_updated_at
before update on public.support_requests
for each row execute function public.set_updated_at();

create index support_requests_user_idx
on public.support_requests(clerk_user_id, created_at desc);
```

## 6. Billing Tables

RevenueCat is the source of truth for purchases. Supabase mirrors the latest state for support, profile display, and backend checks.

```sql
create table public.revenuecat_customers (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  revenuecat_app_user_id text not null unique,
  original_app_user_id text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id)
);

create trigger revenuecat_customers_set_updated_at
before update on public.revenuecat_customers
for each row execute function public.set_updated_at();

create table public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  revenuecat_app_user_id text not null,
  entitlement_id text not null,
  product_id text,
  store text,
  status text not null check (status in ('active', 'trialing', 'grace_period', 'expired', 'cancelled', 'billing_issue', 'unknown')),
  period_type text,
  latest_purchase_at timestamptz,
  original_purchase_at timestamptz,
  expires_at timestamptz,
  will_renew boolean,
  cancellation_reason text,
  raw_customer_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clerk_user_id, entitlement_id)
);

create trigger subscription_entitlements_set_updated_at
before update on public.subscription_entitlements
for each row execute function public.set_updated_at();

create index subscription_entitlements_user_idx
on public.subscription_entitlements(clerk_user_id, status);

create table public.revenuecat_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  revenuecat_app_user_id text,
  clerk_user_id text references public.app_users(clerk_user_id) on delete set null,
  product_id text,
  entitlement_ids text[] not null default '{}',
  purchased_at timestamptz,
  expiration_at timestamptz,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index revenuecat_events_user_idx
on public.revenuecat_events(clerk_user_id, received_at desc);
```

## 7. Notification Tables

```sql
create table public.notification_preferences (
  clerk_user_id text primary key references public.app_users(clerk_user_id) on delete cascade,
  push_enabled boolean not null default false,
  marketing_enabled boolean not null default false,
  saved_document_updates_enabled boolean not null default true,
  billing_updates_enabled boolean not null default true,
  preferred_hour_local int check (preferred_hour_local between 0 and 23),
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.app_users(clerk_user_id) on delete cascade,
  onesignal_user_id text,
  onesignal_subscription_id text,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_model text,
  app_version text,
  push_permission_status text,
  push_enabled boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(onesignal_subscription_id)
);

create trigger user_devices_set_updated_at
before update on public.user_devices
for each row execute function public.set_updated_at();

create index user_devices_user_idx
on public.user_devices(clerk_user_id, last_seen_at desc);
```

## 8. Content Change Logs

```sql
create table public.content_change_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('created', 'updated', 'published', 'archived', 'deleted')),
  summary text,
  changed_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## 9. Enable RLS

```sql
alter table public.app_users enable row level security;
alter table public.user_onboarding_answers enable row level security;

alter table public.countries enable row level security;
alter table public.country_aliases enable row level security;
alter table public.document_categories enable row level security;
alter table public.country_documents enable row level security;
alter table public.document_sources enable row level security;

alter table public.saved_countries enable row level security;
alter table public.saved_documents enable row level security;
alter table public.recently_viewed_documents enable row level security;
alter table public.search_history enable row level security;
alter table public.content_feedback enable row level security;
alter table public.support_requests enable row level security;

alter table public.revenuecat_customers enable row level security;
alter table public.subscription_entitlements enable row level security;
alter table public.revenuecat_events enable row level security;

alter table public.notification_preferences enable row level security;
alter table public.user_devices enable row level security;
alter table public.content_change_logs enable row level security;
```

## 10. RLS Policies: User Profile

```sql
create policy "Users can read own profile"
on public.app_users
for select
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can insert own profile"
on public.app_users
for insert
to authenticated
with check ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can update own profile"
on public.app_users
for update
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can manage own onboarding answers"
on public.user_onboarding_answers
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check ((select public.current_clerk_user_id()) = clerk_user_id);
```

## 11. RLS Policies: Public Published Content

```sql
create policy "Anyone can read active countries"
on public.countries
for select
to anon, authenticated
using (is_active = true);

create policy "Anyone can read aliases for active countries"
on public.country_aliases
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.countries c
    where c.id = country_aliases.country_id
      and c.is_active = true
  )
);

create policy "Anyone can read document categories"
on public.document_categories
for select
to anon, authenticated
using (true);

create policy "Anyone can read published country documents"
on public.country_documents
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.countries c
    where c.id = country_documents.country_id
      and c.is_active = true
  )
);

create policy "Anyone can read sources for published documents"
on public.document_sources
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.country_documents d
    join public.countries c on c.id = d.country_id
    where d.id = document_sources.document_id
      and d.status = 'published'
      and c.is_active = true
  )
);
```

## 12. RLS Policies: Saved Items And Activity

```sql
create policy "Users can manage own saved countries"
on public.saved_countries
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check (
  (select public.current_clerk_user_id()) = clerk_user_id
  and exists (
    select 1
    from public.countries c
    where c.id = saved_countries.country_id
      and c.is_active = true
  )
);

create policy "Users can manage own saved documents"
on public.saved_documents
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check (
  (select public.current_clerk_user_id()) = clerk_user_id
  and exists (
    select 1
    from public.country_documents d
    join public.countries c on c.id = d.country_id
    where d.id = saved_documents.document_id
      and d.status = 'published'
      and c.is_active = true
  )
);

create policy "Users can manage own recently viewed documents"
on public.recently_viewed_documents
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check (
  (select public.current_clerk_user_id()) = clerk_user_id
  and exists (
    select 1
    from public.country_documents d
    join public.countries c on c.id = d.country_id
    where d.id = recently_viewed_documents.document_id
      and d.status = 'published'
      and c.is_active = true
  )
);

create policy "Users can manage own search history"
on public.search_history
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check ((select public.current_clerk_user_id()) = clerk_user_id);
```

## 13. RLS Policies: Feedback And Support

```sql
create policy "Authenticated users can create feedback"
on public.content_feedback
for insert
to authenticated
with check ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can read own feedback"
on public.content_feedback
for select
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can create own support requests"
on public.support_requests
for insert
to authenticated
with check ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can read own support requests"
on public.support_requests
for select
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can update own open support requests"
on public.support_requests
for update
to authenticated
using (
  (select public.current_clerk_user_id()) = clerk_user_id
  and status in ('open', 'waiting')
)
with check ((select public.current_clerk_user_id()) = clerk_user_id);
```

## 14. RLS Policies: Billing

Client apps can read billing mirrors but cannot write them. RevenueCat webhook handlers use the service-role key, which bypasses RLS.

```sql
create policy "Users can read own RevenueCat customer"
on public.revenuecat_customers
for select
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can read own entitlements"
on public.subscription_entitlements
for select
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can read own billing event summaries"
on public.revenuecat_events
for select
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id);
```

## 15. RLS Policies: Notifications

```sql
create policy "Users can manage own notification preferences"
on public.notification_preferences
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check ((select public.current_clerk_user_id()) = clerk_user_id);

create policy "Users can manage own devices"
on public.user_devices
for all
to authenticated
using ((select public.current_clerk_user_id()) = clerk_user_id)
with check ((select public.current_clerk_user_id()) = clerk_user_id);
```

## 16. RLS Policies: Content Change Logs

Content logs should be written by service-role scripts or admin tooling. They are not exposed to regular app users.

```sql
-- No anon/authenticated policies on content_change_logs for the first release.
-- Service role can still insert/select for private admin workflows.
```

## 17. Optional RPC: Ensure User Profile

Because Clerk webhooks are eventually consistent, call this after sign-in to make sure the profile row exists.

```sql
create or replace function public.ensure_user_profile()
returns public.app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.current_clerk_user_id();
  v_profile public.app_users;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.app_users (clerk_user_id)
  values (v_user_id)
  on conflict (clerk_user_id) do nothing;

  select *
  into v_profile
  from public.app_users
  where clerk_user_id = v_user_id;

  return v_profile;
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;
```

## 18. Useful Queries For The App

The examples in this section are written so they can be pasted directly into the Supabase SQL Editor. PostgreSQL does not understand placeholder syntax like `:query` or `:country_slug` in the SQL Editor. Those placeholders are only pseudocode for app code, RPC functions, or query builders.

### Search Published Country Documents

```sql
with params as (
  select 'greece work visa'::text as search_query
)
select
  d.id,
  d.title,
  d.slug,
  d.short_description,
  d.is_premium,
  d.language,
  c.name as country_name,
  c.slug as country_slug,
  c.flag_emoji,
  dc.name as category_name,
  dc.slug as category_slug
from public.country_documents d
join public.countries c on c.id = d.country_id
join public.document_categories dc on dc.id = d.category_id
cross join params p
where d.status = 'published'
  and c.is_active = true
  and (
    d.search_text ilike '%' || lower(p.search_query) || '%'
    or c.name ilike '%' || lower(p.search_query) || '%'
    or dc.name ilike '%' || lower(p.search_query) || '%'
  )
order by c.popularity_rank nulls last, d.sort_order, d.title
limit 25;
```

### Get Documents For One Country

```sql
with params as (
  select
    'greece'::text as country_slug,
    'en'::text as language
)
select
  d.id,
  d.title,
  d.slug,
  d.short_description,
  d.is_premium,
  dc.name as category_name,
  dc.slug as category_slug
from public.country_documents d
join public.document_categories dc on dc.id = d.category_id
join public.countries c on c.id = d.country_id
cross join params p
where c.slug = p.country_slug
  and c.is_active = true
  and d.status = 'published'
  and d.language = coalesce(p.language, 'en')
order by dc.sort_order, d.sort_order, d.title;
```

### Read Active Entitlement

```sql
select *
from public.subscription_entitlements
where clerk_user_id = public.current_clerk_user_id()
  and entitlement_id = 'premium'
  and status in ('active', 'trialing', 'grace_period')
  and (expires_at is null or expires_at > now())
limit 1;
```

## 19. Webhook Write Responsibilities

### Clerk Webhook

Writes:

- `app_users`

Events:

- `user.created`
- `user.updated`
- `user.deleted`

### RevenueCat Webhook

Writes:

- `revenuecat_customers`
- `subscription_entitlements`
- `revenuecat_events`

Events to handle:

- initial purchase
- renewal
- cancellation
- expiration
- billing issue
- product change
- transfer

### RevenueCat Sync (`revenuecat-sync`)

Called by the app (not by RevenueCat) after a purchase or restore, from "Already paid? Refresh status", and at launch when the App Store account owns Premium but `user_plan` is still `Free`. It verifies the caller's Clerk token by calling `ensure_user_profile` through the Data API with that token, reads the customer from RevenueCat's REST API v1 with `REVENUECAT_SECRET_API_KEY`, and writes:

- `revenuecat_customers`
- `subscription_entitlements` (status `active` for `premium`)
- `app_users.user_plan` = `PRO` only; it never downgrades (refunds arrive as webhook `CANCELLATION` events)

It exists because RevenueCat sends no webhook event for a purchase it already knows (re-download of an owned non-consumable, restore that changes nothing), so the webhook alone cannot activate those accounts.

### OneSignal

Writes are usually client-driven for:

- `notification_preferences`
- `user_devices`

Server-side notification sends should use OneSignal REST API from a trusted backend only.

## 20. Notes Before Applying In Production

- Review all check constraints against final product copy and business rules.
- Consider whether `search_history` should be disabled by default for privacy.
- Add database backups before importing real content.
- Keep `is_premium` enforcement in the app and backend. RLS alone does not hide premium content rows in this baseline because previews and paywalls may need metadata. If premium body text must be hidden from non-subscribers, split premium content into a separate table with entitlement-aware server access.
- Supabase service-role key must never be used in the Expo app.

## 21. Clerk webhook integration with supabase

Clerk needs a public backend endpoint for webhooks. A mobile app cannot be the webhook endpoint because Clerk must send an HTTP `POST` request to a server URL. For this project, use a Supabase Edge Function as the webhook receiver.

Final production endpoint format:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/clerk-webhook
```

The flow:

```text
User signs up in Expo app
Clerk creates the user
Clerk sends user.created webhook to Supabase Edge Function
Edge Function verifies Clerk signature
Edge Function upserts public.app_users with the Clerk user ID
App can now read/write user-owned data in Supabase
```

### Step 1: Prepare Supabase from SQL Editor

Open Supabase Dashboard -> SQL Editor -> New query.

Run this SQL after the core schema has been created. It creates a small webhook event log so Clerk retries are idempotent.

```sql
create table if not exists public.clerk_webhook_events (
  event_id text primary key,
  event_type text not null,
  clerk_user_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.clerk_webhook_events enable row level security;

-- No anon/authenticated policies are added.
-- This table is written by the Supabase service role inside the Edge Function.
```

Confirm `app_users` exists:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'app_users'
order by ordinal_position;
```

You should see `clerk_user_id` as the primary identifier. Clerk user IDs are strings like `user_...`, so this column must be `text`, not `uuid`.

Optional test after a webhook runs:

```sql
select
  clerk_user_id,
  email,
  first_name,
  last_name,
  created_at,
  updated_at,
  deleted_at
from public.app_users
order by created_at desc
limit 20;
```

### Step 2: Create the Supabase Edge Function

The SQL Editor cannot create the HTTP endpoint itself. The endpoint must be created as a Supabase Edge Function.

Create this file:

```text
supabase/functions/clerk-webhook/index.ts
```

Use this function:

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyWebhook } from "npm:@clerk/backend/webhooks";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserPayload = {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  created_at?: number;
  updated_at?: number;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signingSecret = Deno.env.get("CLERK_WEBHOOK_SIGNING_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response("Missing server configuration", { status: 500 });
  }

  let event;
  try {
    event = await verifyWebhook(req, { signingSecret });
  } catch {
    return new Response("Invalid Clerk webhook signature", { status: 400 });
  }

  const eventId = req.headers.get("svix-id");
  if (!eventId) {
    return new Response("Missing svix-id", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const user = event.data as ClerkUserPayload;

  const { error: eventInsertError } = await supabase
    .from("clerk_webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.type,
      clerk_user_id: user.id ?? null,
      payload: event,
    });

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return new Response("Duplicate event ignored", { status: 200 });
    }

    return new Response(eventInsertError.message, { status: 500 });
  }

  const primaryEmail = user.email_addresses?.find(
    (email) => email.id === user.primary_email_address_id,
  )?.email_address;

  if (event.type === "user.created" || event.type === "user.updated") {
    const { error } = await supabase.from("app_users").upsert({
      clerk_user_id: user.id,
      email: primaryEmail ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      image_url: user.image_url ?? null,
      deleted_at: null,
      clerk_created_at: user.created_at
        ? new Date(user.created_at).toISOString()
        : null,
      clerk_updated_at: user.updated_at
        ? new Date(user.updated_at).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    });

    if (error) return new Response(error.message, { status: 500 });
  }

  if (event.type === "user.deleted") {
    const { error } = await supabase
      .from("app_users")
      .update({
        email: null,
        first_name: null,
        last_name: null,
        image_url: null,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", user.id);

    if (error) return new Response(error.message, { status: 500 });
  }

  await supabase
    .from("clerk_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", eventId);

  return new Response("ok", { status: 200 });
});
```

### Step 3: Deploy the Edge Function

Deploy with JWT verification disabled. Clerk will not send a Supabase JWT. The function verifies Clerk's webhook signature instead.

```bash
supabase functions deploy clerk-webhook --no-verify-jwt
```

After deploy, your endpoint is:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/clerk-webhook
```

You can find your project ref in Supabase Dashboard -> Project Settings -> General.

### Step 4: Add Supabase function secrets

In Supabase Dashboard, go to:

```text
Project Settings -> Edge Functions -> Secrets
```

Add:

```text
CLERK_WEBHOOK_SIGNING_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

You get `CLERK_WEBHOOK_SIGNING_SECRET` after creating the webhook endpoint in Clerk. If you need to deploy first, create the Clerk endpoint, copy the signing secret, add it to Supabase secrets, then redeploy or retry the webhook.

You can also add secrets with the CLI:

```bash
supabase secrets set CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in the Expo app.

### Step 5: Create the webhook endpoint in Clerk

In Clerk Dashboard:

1. Go to `Developers -> Webhooks`.
2. Click `New Endpoint`.
3. In `Endpoint URL`, paste:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/clerk-webhook
```

4. Add a description, for example:

```text
Sync Clerk users to Supabase app_users
```

5. Subscribe to these events:

```text
user.created
user.updated
user.deleted
```

6. Click `Create`.
7. Open the created endpoint.
8. Copy the signing secret.
9. Add that signing secret to Supabase as `CLERK_WEBHOOK_SIGNING_SECRET`.

### Step 6: Test the webhook

In Clerk Dashboard:

1. Open the webhook endpoint.
2. Go to the testing/sending area.
3. Send a `user.created` test event.
4. Then open Supabase SQL Editor and run:

```sql
select *
from public.clerk_webhook_events
order by created_at desc
limit 10;
```

Then check users:

```sql
select
  clerk_user_id,
  email,
  first_name,
  last_name,
  deleted_at,
  created_at,
  updated_at
from public.app_users
order by updated_at desc
limit 10;
```

If both tables show data, the integration is working.

### Step 7: Test with real signup

1. Run the Expo app.
2. Sign up with a new email using Clerk.
3. Wait a few seconds.
4. In Supabase SQL Editor, run:

```sql
select
  clerk_user_id,
  email,
  first_name,
  last_name,
  created_at
from public.app_users
order by created_at desc
limit 5;
```

The new Clerk user should appear in `app_users`.

### Troubleshooting

If Clerk shows webhook failures:

- Confirm the endpoint URL is exactly:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/clerk-webhook
```

- Confirm the function was deployed with:

```bash
--no-verify-jwt
```

- Confirm `CLERK_WEBHOOK_SIGNING_SECRET` is set in Supabase secrets.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Supabase secrets.
- Check Supabase Dashboard -> Edge Functions -> `clerk-webhook` -> Logs.
- Check Clerk Dashboard -> Webhooks -> endpoint -> Logs.
- If the SQL Editor query returns no users, check `clerk_webhook_events` first. If events exist but `app_users` is empty, the function received Clerk's webhook but failed during the user upsert.

Common mistakes:

- Using the Expo app URL as the webhook URL.
- Forgetting `--no-verify-jwt`.
- Copying the wrong Clerk signing secret.
- Putting the service-role key in the mobile app instead of Edge Function secrets.
- Using a UUID column for Clerk user IDs. Clerk user IDs must be stored as `text`.

### Step 8: Enable Clerk tokens for mobile app RLS queries

The Clerk webhook only syncs user rows into `app_users`. It does not make the Expo app authenticated to Supabase for direct RLS-protected queries.

If the mobile app shows this error:

```text
PGRST301: No suitable key was found to decode the JWT
```

it means Supabase received a Clerk JWT from the app, but your Supabase project is not yet configured to verify that token.

Recommended setup:

1. In Clerk Dashboard, configure Supabase compatibility for your Clerk instance.
2. Make sure Clerk session tokens include this claim:

```json
{
  "role": "authenticated"
}
```

3. In Supabase Dashboard, open Authentication.
4. Open Third-Party Auth.
5. Add Clerk as a provider.
6. Enter the Clerk domain/issuer requested by Supabase.
7. Save the integration.
8. Restart the Expo dev server.
9. Sign out of the app and sign in again so Clerk issues a fresh token.

The app is already configured to send Clerk's session token to Supabase with:

```ts
accessToken: async () => session?.getToken() ?? null;
```

After the Third-Party Auth integration is enabled, Supabase can verify the Clerk token and the existing RLS policies using `auth.jwt()->>'sub'` will work.

Legacy fallback:

If you decide to use Clerk's older Supabase JWT template approach instead of Supabase Third-Party Auth, create a Clerk JWT template, commonly named `supabase`, and add this public env value:

```env
EXPO_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE=supabase
```

Then restart Expo and sign in again. The Third-Party Auth setup above is preferred because it avoids sharing the Supabase JWT secret with Clerk.
