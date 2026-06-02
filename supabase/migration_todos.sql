-- ============================================================================
-- Our_Home — 공유 To-Do / 장보기 리스트
-- 부부가 함께 보는 할 일·장보기 체크리스트. 한 사람이 체크하면 실시간 반영.
-- Supabase SQL Editor에 붙여넣고 Run 하세요. (1회)
-- ============================================================================
create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete set null,
  kind       text not null default 'todo' check (kind in ('todo', 'shopping')),
  title      text not null,
  done       boolean not null default false,
  done_by    uuid references public.users (id) on delete set null,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists todos_family_idx on public.todos (family_id, kind, done, created_at desc);

alter table public.todos enable row level security;

create policy "family read" on public.todos
  for select using (family_id = public.current_family_id());
create policy "family write" on public.todos
  for insert with check (family_id = public.current_family_id() and author_id = auth.uid());
create policy "family modify" on public.todos
  for update using (family_id = public.current_family_id());
create policy "family delete" on public.todos
  for delete using (family_id = public.current_family_id());

-- 실시간: 체크/추가/삭제를 양쪽 화면에 즉시 반영.
alter publication supabase_realtime add table public.todos;
