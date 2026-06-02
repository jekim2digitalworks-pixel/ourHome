-- ============================================================================
-- Our_Home — 가족 공유 메모장(대시보드 헤더)
-- 같은 가족(초대 코드로 합류 포함)은 하나의 메모장을 함께 보고 수정합니다.
-- 수정할 때마다 한 행이 쌓여 "수정 내역"이 됩니다. 가장 최신 행이 현재 메모입니다.
-- Supabase SQL Editor에 붙여넣고 Run 하세요. (1회)
-- ============================================================================

create table if not exists public.memos (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete set null,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists memos_family_time_idx on public.memos (family_id, created_at desc);

alter table public.memos enable row level security;

create policy "family read" on public.memos
  for select using (family_id = public.current_family_id());
create policy "family write" on public.memos
  for insert with check (family_id = public.current_family_id() and author_id = auth.uid());
create policy "family delete" on public.memos
  for delete using (family_id = public.current_family_id());

-- 실시간: 한 사람이 메모를 고치면 배우자 화면에도 즉시 반영.
alter publication supabase_realtime add table public.memos;
