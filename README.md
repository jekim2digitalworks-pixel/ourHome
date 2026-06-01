# Our_Home — 부부 공동 관리 플랫폼

캘린더 · 스마트 가계부 · 실시간 육아 차트 · 사진첩을 한 곳에서. Next.js (App Router) +
Supabase + Google APIs로 구축한 프리미엄 글래스모피즘 대시보드.

## 폴더 구조

```
ourHome/
├── app/
│   ├── layout.tsx                 # 루트 레이아웃 (Pretendard, 다크 테마)
│   ├── globals.css                # Tailwind + .glass 더블베젤 유틸리티
│   ├── page.tsx                   # 랜딩 (히어로 + 더블베젤 카드)
│   ├── login/page.tsx             # 매직링크 로그인
│   ├── dashboard/page.tsx         # ★ 메인 대시보드 (개인화/탭/그리드)
│   └── api/google/
│       ├── connect/route.ts       # OAuth2 동의 화면으로 리다이렉트
│       ├── callback/route.ts      # code 교환 + refresh_token 저장
│       ├── calendar/route.ts      # 캘린더 조회/등록 (양방향 미러)
│       └── drive/upload/route.ts  # Drive 업로드 → 링크만 DB 저장
├── components/
│   ├── ui/GlassCard.tsx           # 더블베젤 글래스 카드 프리미티브
│   └── dashboard/
│       ├── Sidebar.tsx            # 사이드바 + 모바일 탭바
│       ├── TopBar.tsx             # 플로팅 글래스 상단바
│       ├── CalendarCard.tsx
│       ├── AssetSummaryCard.tsx   # recharts 요약 + 즉시 입력
│       ├── BabyTimelineCard.tsx   # ★ Supabase Realtime 구독
│       ├── PhotoCoverflowCard.tsx # Swiper coverflow
│       └── SettingsPanel.tsx      # 활성 탭/메인 우선순위 개인화
├── lib/
│   ├── supabase/{client,server,admin,types}.ts
│   ├── google/oauth.ts            # ★ OAuth2 + refresh token 갱신 로직
│   └── format.ts                  # 정수(minor unit) 기반 금액 처리
├── supabase/schema.sql            # ★ 테이블 + RLS + Realtime + 고정비 이월
├── middleware.ts                  # 세션 갱신 + /dashboard 보호
├── tailwind.config.ts             # ease-out-back, bezel shadow, accent 토큰
└── .env.local.example
```

## 필요한 환경변수 (`.env.local`)

`.env.local.example`를 복사해 채우세요.

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트·서버 Supabase 접속 |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** — Google 토큰 읽기/갱신 (RLS 우회) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 자격증명 |
| `GOOGLE_REDIRECT_URI` | `…/api/google/callback` 와 정확히 일치 |
| `GOOGLE_DRIVE_FOLDER_ID` | (선택) 업로드 폴더 고정 |

## 셋업

```bash
npm install
# 1) Supabase 프로젝트 SQL 에디터에 supabase/schema.sql 전체 실행
# 2) Google Cloud에서 Calendar/Drive API 활성화 + OAuth 동의 화면 + 자격증명
# 3) .env.local 작성
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
npm run dev   # http://localhost:3000
```

## 설계 하이라이트

- **RLS**: `current_family_id()` 헬퍼로 모든 공유 테이블을 본인 가족 범위로 제한.
- **금액 정밀도**: 모든 금액을 정수 minor unit으로 저장 → 부동소수점 오차 차단.
- **고정비 이월**: `rollover_fixed_costs()` 함수 (pg_cron/스케줄러로 월 1회 호출).
- **실시간 동기화**: `baby_records`·`transactions`·`events`를 Realtime publication에 등록,
  `BabyTimelineCard`가 `postgres_changes`를 구독 → 새로고침 없이 양쪽 화면 갱신.
- **Refresh Token**: `getAuthorizedClient()`가 만료 60초 전 자동 갱신하고, Google이
  토큰을 회전시키면 `tokens` 이벤트로 Supabase에 즉시 재저장.
- **사진**: 바이너리는 Drive에만, DB에는 `web_view_link`만 저장.

> 데모: Supabase 미설정 상태에서도 각 카드는 샘플 데이터로 렌더링됩니다.
> `familyId`를 서버 세션에서 주입하면 실시간 모드로 전환됩니다.
