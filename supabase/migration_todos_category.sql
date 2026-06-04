-- ============================================================================
-- Our_Home — 가사 일 같이하기: 카테고리 + 날짜(캘린더) 확장
-- 기존 todos 테이블에 카테고리 분류와 날짜 필터용 컬럼을 추가합니다.
-- Supabase SQL Editor에 붙여넣고 Run 하세요. (1회)
-- ============================================================================

-- 카테고리: 장보기 / 육아 / 행사 / 이벤트 / 집안일 / 기타 / (직접입력 = 임의 문자열)
alter table public.todos
  add column if not exists category text not null default '기타';

-- 날짜(캘린더 필터용). null 이면 "날짜 미지정".
alter table public.todos
  add column if not exists due_date date;

-- 기존 장보기 항목을 '장보기' 카테고리로 백필.
update public.todos set category = '장보기' where kind = 'shopping' and category = '기타';

-- 날짜별 조회 인덱스.
create index if not exists todos_family_due_idx
  on public.todos (family_id, due_date, done);
