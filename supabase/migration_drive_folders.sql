-- ============================================================================
-- Our_Home — Drive 폴더 미러링용 컬럼 추가
-- Supabase SQL Editor에 붙여넣고 Run 하세요. (1회)
-- ============================================================================

-- 연동 계정별 "Our_Home" 최상위 폴더 id (한 번 만들고 재사용).
-- 카테고리 하위 폴더는 각자 본인 Drive에서 이름으로 find-or-create 하므로
-- 별도 컬럼 캐시 없이 동작합니다(배우자마다 Drive가 다르기 때문).
alter table public.google_tokens
  add column if not exists drive_root_folder_id text;
