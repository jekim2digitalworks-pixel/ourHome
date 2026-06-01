-- ============================================================================
-- Our_Home — 육아 기록 카테고리 확장
-- 기존: feeding(수유) · diaper(배변) · sleep(수면) · bath(목욕) · memo(메모)
-- 변경: 배변을 소변(pee)/대변(poop)으로 분리, 이유식(food) 추가
-- Supabase SQL Editor에 붙여넣고 Run 하세요. (1회)
-- ============================================================================

-- 1) 옛 제약을 먼저 제거 (안 그러면 아래 UPDATE가 옛 제약에 걸립니다)
alter table public.baby_records drop constraint if exists baby_records_category_check;

-- 2) 기존 diaper 기록을 대변(poop)으로 이관 (없으면 영향 없음)
update public.baby_records set category = 'poop' where category = 'diaper';

-- 3) 새 제약 추가
alter table public.baby_records
  add constraint baby_records_category_check
  check (category in ('feeding', 'food', 'pee', 'poop', 'sleep', 'bath', 'memo'));
