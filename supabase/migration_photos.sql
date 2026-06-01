-- ============================================================================
-- Our_Home — 사진첩 카테고리 마이그레이션
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 Run 하세요. (1회)
-- ============================================================================

-- 1) 사진 분류용 카테고리 테이블
create table if not exists public.photo_categories (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists photo_categories_family_idx on public.photo_categories (family_id, sort_order);

-- 2) photos에 카테고리 연결 컬럼 추가 (분류 없으면 null = "전체")
alter table public.photos
  add column if not exists category_id uuid references public.photo_categories (id) on delete set null;

-- 3) RLS — 본인 가족 범위로 제한
alter table public.photo_categories enable row level security;

drop policy if exists "family read" on public.photo_categories;
drop policy if exists "family write" on public.photo_categories;
drop policy if exists "family modify" on public.photo_categories;
drop policy if exists "family delete" on public.photo_categories;

create policy "family read" on public.photo_categories
  for select using (family_id = public.current_family_id());
create policy "family write" on public.photo_categories
  for insert with check (family_id = public.current_family_id());
create policy "family modify" on public.photo_categories
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.photo_categories
  for delete using (family_id = public.current_family_id());

-- 4) Realtime — 사진/카테고리 변경을 부부 화면에 실시간 반영
do $$
begin
  alter publication supabase_realtime add table public.photos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.photo_categories;
exception when duplicate_object then null;
end $$;
