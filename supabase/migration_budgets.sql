-- ============================================================================
-- Our_Home — 카테고리별 월 예산
-- 지출 카테고리마다 매월 한도를 정해두고, 초과 시 가계부에서 경고를 표시.
-- 한도는 매월 반복 적용(월별 행을 만들지 않음).
-- Supabase SQL Editor에 붙여넣고 Run 하세요. (1회)
-- ============================================================================

create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  category     text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  created_at   timestamptz not null default now(),
  unique (family_id, category)
);
create index if not exists budgets_family_idx on public.budgets (family_id);

alter table public.budgets enable row level security;

create policy "family read" on public.budgets
  for select using (family_id = public.current_family_id());
create policy "family write" on public.budgets
  for insert with check (family_id = public.current_family_id());
create policy "family modify" on public.budgets
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.budgets
  for delete using (family_id = public.current_family_id());

alter publication supabase_realtime add table public.budgets;
