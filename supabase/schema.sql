-- ============================================================================
-- Our_Home — Supabase schema (PostgreSQL)
-- Run this whole file in the Supabase SQL editor on a fresh project.
-- Money is stored as integer minor units to avoid floating-point drift.
-- RLS guarantees a user can only ever touch rows in their own Family.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Families (a couple = one family group)
-- ----------------------------------------------------------------------------
create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Users — profile row mirroring auth.users, carrying the family link
-- ----------------------------------------------------------------------------
create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  family_id    uuid references public.families (id) on delete set null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Helper used by every RLS policy below. SECURITY DEFINER so the policy can
-- read public.users without recursively triggering the users policy.
create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.users where id = auth.uid();
$$;

-- Auto-provision a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Settings — per-user dashboard personalization
-- ----------------------------------------------------------------------------
create table public.settings (
  user_id      uuid primary key references public.users (id) on delete cascade,
  enabled_tabs text[]  not null default array['calendar','assets','baby','photos'],
  primary_tab  text    not null default 'calendar',
  tab_order    text[]  not null default array['calendar','assets','baby','photos'],
  theme        text    not null default 'dark',
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Transactions — smart ledger
-- ----------------------------------------------------------------------------
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  author_id    uuid not null references public.users (id) on delete set null,
  type         text not null check (type in ('income','expense')),
  amount_minor bigint not null check (amount_minor >= 0),  -- integer-safe money
  category     text not null default '기타',
  memo         text,
  is_fixed     boolean not null default false,             -- 고정비 (월 이월 대상)
  occurred_on  date not null default current_date,
  created_at   timestamptz not null default now()
);
create index transactions_family_date_idx on public.transactions (family_id, occurred_on desc);

-- ----------------------------------------------------------------------------
-- 5. Baby records — BabyTime-style timeline
-- ----------------------------------------------------------------------------
create table public.baby_records (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  author_id   uuid not null references public.users (id) on delete set null,
  category    text not null check (category in ('feeding','diaper','sleep','bath','memo')),
  detail      jsonb not null default '{}'::jsonb,  -- e.g. {"amount_ml":120,"side":"left"}
  note        text,
  recorded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index baby_records_family_time_idx on public.baby_records (family_id, recorded_at desc);

-- ----------------------------------------------------------------------------
-- 6. Events — calendar (native + Google Calendar mirror)
-- ----------------------------------------------------------------------------
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  author_id       uuid not null references public.users (id) on delete set null,
  title           text not null,
  description     text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  google_event_id text,                              -- null = native-only event
  created_at      timestamptz not null default now()
);
create index events_family_start_idx on public.events (family_id, starts_at);

-- ----------------------------------------------------------------------------
-- 7. Photos — only the Google Drive link lives in the DB, never the binary
-- ----------------------------------------------------------------------------
create table public.photos (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  author_id      uuid not null references public.users (id) on delete set null,
  drive_file_id  text not null,
  web_view_link  text not null,
  thumbnail_link text,
  taken_on       date not null default current_date,
  caption        text,
  created_at     timestamptz not null default now()
);
create index photos_family_date_idx on public.photos (family_id, taken_on desc);

-- ----------------------------------------------------------------------------
-- 8. Google tokens — server-only refresh tokens (NEVER exposed to the client)
-- ----------------------------------------------------------------------------
create table public.google_tokens (
  user_id       uuid primary key references public.users (id) on delete cascade,
  refresh_token text not null,
  access_token  text,
  scope         text,
  expiry_date   bigint,
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.families      enable row level security;
alter table public.users         enable row level security;
alter table public.settings      enable row level security;
alter table public.transactions  enable row level security;
alter table public.baby_records  enable row level security;
alter table public.events        enable row level security;
alter table public.photos        enable row level security;
alter table public.google_tokens enable row level security;

-- families: members can read their own family; any authed user can create one.
create policy "family members read" on public.families
  for select using (id = public.current_family_id());
create policy "create own family" on public.families
  for insert with check (created_by = auth.uid());
create policy "family members update" on public.families
  for update using (id = public.current_family_id());

-- users: read everyone in your family; only edit your own profile row.
create policy "read family members" on public.users
  for select using (family_id = public.current_family_id() or id = auth.uid());
create policy "update own profile" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- settings: strictly private to the owning user.
create policy "own settings" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Shared family tables: identical family-scoped policy pattern.
-- Macro applied to transactions / baby_records / events / photos.
create policy "family read" on public.transactions
  for select using (family_id = public.current_family_id());
create policy "family write" on public.transactions
  for insert with check (family_id = public.current_family_id() and author_id = auth.uid());
create policy "family modify" on public.transactions
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.transactions
  for delete using (family_id = public.current_family_id());

create policy "family read" on public.baby_records
  for select using (family_id = public.current_family_id());
create policy "family write" on public.baby_records
  for insert with check (family_id = public.current_family_id() and author_id = auth.uid());
create policy "family modify" on public.baby_records
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.baby_records
  for delete using (family_id = public.current_family_id());

create policy "family read" on public.events
  for select using (family_id = public.current_family_id());
create policy "family write" on public.events
  for insert with check (family_id = public.current_family_id() and author_id = auth.uid());
create policy "family modify" on public.events
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.events
  for delete using (family_id = public.current_family_id());

create policy "family read" on public.photos
  for select using (family_id = public.current_family_id());
create policy "family write" on public.photos
  for insert with check (family_id = public.current_family_id() and author_id = auth.uid());
create policy "family modify" on public.photos
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.photos
  for delete using (family_id = public.current_family_id());

-- google_tokens: owner-only. In practice the server uses the service-role key
-- (which bypasses RLS) to read these, but this policy hard-blocks client reads.
create policy "own google tokens" on public.google_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- REALTIME — broadcast row changes so both partners stay in sync live.
-- ============================================================================
alter publication supabase_realtime add table public.baby_records;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.events;

-- ============================================================================
-- 9. Month-rollover for fixed costs (고정비 이월).
-- Call once per month (e.g. Supabase scheduled job / pg_cron) to clone the
-- previous month's fixed-cost rows into the current month.
-- ============================================================================
create or replace function public.rollover_fixed_costs(target_family uuid, target_month date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  with prev as (
    select type, amount_minor, category, memo
    from public.transactions
    where family_id = target_family
      and is_fixed
      and date_trunc('month', occurred_on) = date_trunc('month', target_month) - interval '1 month'
  )
  insert into public.transactions (family_id, author_id, type, amount_minor, category, memo, is_fixed, occurred_on)
  select target_family,
         (select created_by from public.families where id = target_family),
         type, amount_minor, category, memo, true,
         date_trunc('month', target_month)::date
  from prev;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
