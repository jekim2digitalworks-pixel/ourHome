import Link from "next/link";
import {
  Home,
  ArrowRight,
  Wallet,
  Baby,
  Images,
  CalendarDays,
  RefreshCw,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/server";

/* ──────────────────────────────────────────────────────────────────────────
 * 로그인 전 랜딩.
 * "혼자 짊어지지 않는다" 는 정서적 메시지를 중심으로, 각 기능을 실제 화면을
 * 닮은 더미 데이터 목업과 함께 보여줍니다. (정적 컴포넌트 — 클라이언트 훅 없음)
 * ────────────────────────────────────────────────────────────────────────── */

/* ── 작은 아바타 (이니셜) ── */
function Avatar({ initial, tone }: { initial: string; tone: string }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${tone}`}
    >
      {initial}
    </span>
  );
}

/* ── 목업을 감싸는 미니 앱 윈도우 프레임 ── */
function MockWindow({ children }: { children: React.ReactNode }) {
  return (
    <GlassCard className="p-0">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/50" />
        <span className="ml-2 text-[11px] text-zinc-500">Our_Home</span>
      </div>
      <div className="p-4">{children}</div>
    </GlassCard>
  );
}

/* ── 1. 가계부 목업 ── */
function WalletMock() {
  const stats = [
    { label: "수입", value: "₩4,200,000", tone: "text-emerald-300" },
    { label: "지출", value: "₩2,860,000", tone: "text-rose-300" },
    { label: "잔액", value: "₩1,340,000", tone: "text-accent" },
  ];
  const rows = [
    { cat: "급여", memo: "이번 달 월급", amount: "+₩4,200,000", tone: "text-emerald-300" },
    { cat: "식비", memo: "주말 장보기", amount: "−₩64,000", tone: "text-zinc-300" },
    { cat: "육아", memo: "기저귀·분유", amount: "−₩38,500", tone: "text-zinc-300" },
    { cat: "고정비", memo: "월세 자동이월", amount: "−₩750,000", tone: "text-zinc-300" },
  ];
  return (
    <MockWindow>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
            <p className="text-[11px] text-zinc-500">{s.label}</p>
            <p className={`mt-0.5 text-sm font-semibold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.memo}
            className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
          >
            <span className="flex items-center gap-2">
              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-400">
                {r.cat}
              </span>
              <span className="text-xs text-zinc-300">{r.memo}</span>
            </span>
            <span className={`text-xs font-medium ${r.tone}`}>{r.amount}</span>
          </li>
        ))}
      </ul>
    </MockWindow>
  );
}

/* ── 2. 육아 차트 목업 ── */
function BabyMock() {
  const items = [
    { t: "14:30", emoji: "🍼", label: "수유", detail: "120ml", who: { i: "은", tone: "bg-accent/20 text-accent" } },
    { t: "12:10", emoji: "😴", label: "수면", detail: "1시간 20분", who: { i: "준", tone: "bg-accent-cool/20 text-accent-cool" } },
    { t: "09:40", emoji: "💩", label: "대변", detail: "", who: { i: "은", tone: "bg-accent/20 text-accent" } },
    { t: "08:00", emoji: "🥣", label: "이유식", detail: "쌀미음", who: { i: "준", tone: "bg-accent-cool/20 text-accent-cool" } },
  ];
  return (
    <MockWindow>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">오늘 · 06.04 (목)</span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          실시간
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it.t}
            className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
          >
            <span className="text-[11px] tabular-nums text-zinc-500">{it.t}</span>
            <span className="text-base">{it.emoji}</span>
            <span className="text-xs text-zinc-300">{it.label}</span>
            {it.detail && <span className="text-[11px] text-zinc-500">{it.detail}</span>}
            <span className="ml-auto">
              <Avatar initial={it.who.i} tone={it.who.tone} />
            </span>
          </li>
        ))}
      </ul>
    </MockWindow>
  );
}

/* ── 3. 사진첩 목업 ── */
function PhotoMock() {
  const tiles = [
    { grad: "from-rose-400/30 to-amber-300/20", emoji: "👶", liked: true },
    { grad: "from-amber-300/30 to-orange-400/15", emoji: "🐶", liked: false },
    { grad: "from-sky-400/30 to-accent/20", emoji: "👨‍👩‍👧", liked: false },
    { grad: "from-emerald-400/25 to-accent-cool/20", emoji: "🌳", liked: false },
    { grad: "from-accent/25 to-rose-400/15", emoji: "🎂", liked: false },
    { grad: "from-accent-cool/30 to-sky-400/15", emoji: "🏡", liked: false },
  ];
  return (
    <MockWindow>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">2026.05 · 제주 가족여행</span>
        <span className="text-[10px] text-zinc-500">사진 24장</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br ${t.grad}`}
          >
            <span className="text-2xl drop-shadow-sm">{t.emoji}</span>
            {t.liked && (
              <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-rose-300 backdrop-blur-sm">
                <Heart className="h-3 w-3" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

/* ── 4. 캘린더 목업 ── */
function CalendarMock() {
  // 6월 첫 주 시작 요일 보정용 빈칸(1일=월) — 간단 더미
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const marked: Record<number, string> = { 4: "bg-accent", 9: "bg-rose-400", 21: "bg-accent-cool" };
  const events = [
    { d: "04", label: "소아과 예방접종", tone: "bg-accent" },
    { d: "09", label: "결혼기념일 💍", tone: "bg-rose-400" },
    { d: "21", label: "양가 부모님 식사", tone: "bg-accent-cool" },
  ];
  return (
    <MockWindow>
      <div className="mb-2 text-xs font-medium text-zinc-300">2026년 6월</div>
      <div className="grid grid-cols-7 gap-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
          <span key={w} className="py-1 text-center text-[9px] text-zinc-600">
            {w}
          </span>
        ))}
        <span />
        {days.map((d) => (
          <span
            key={d}
            className="relative flex h-6 items-center justify-center rounded-md text-[10px] text-zinc-400"
          >
            {d}
            {marked[d] && (
              <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${marked[d]}`} />
            )}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {events.map((e) => (
          <li key={e.d} className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${e.tone}`} />
            <span className="text-[11px] text-zinc-500">6/{e.d}</span>
            <span className="text-xs text-zinc-300">{e.label}</span>
          </li>
        ))}
      </ul>
    </MockWindow>
  );
}

const FEATURES = [
  {
    icon: Wallet,
    accent: "text-accent",
    eyebrow: "함께 쓰는 가계부",
    title: "돈 이야기, 더는 혼자 끙끙대지 않아요",
    desc:
      "누가 더 썼는지 따지는 가계부가 아니에요. 두 사람이 같은 숫자를 바라보며, 이번 달을 함께 꾸려가는 가계부입니다. 고정비는 매달 알아서 채워지니 잊고 살아도 괜찮아요.",
    Mock: WalletMock,
  },
  {
    icon: Baby,
    accent: "text-accent-cool",
    eyebrow: "함께 보는 육아 기록",
    title: "아이의 오늘을, 떨어져 있어도 함께",
    desc:
      "출근한 당신도 아이의 하루를 놓치지 않도록. 한 사람이 수유 시간을 남기면 다른 화면에 새로고침 없이 곧바로 떠올라요. 육아의 무게를 혼자 지지 않게, 두 사람이 같은 타임라인을 채웁니다.",
    Mock: BabyMock,
  },
  {
    icon: Images,
    accent: "text-accent",
    eyebrow: "함께 만드는 사진첩",
    title: "흩어진 추억을, 같은 앨범 한 곳에",
    desc:
      "각자 휴대폰에 묻혀 있던 그날의 사진을 한 앨범으로 모아요. 원본은 본인 Google Drive에 안전하게 남고, 우리는 날짜별로 추억만 넘겨봅니다. 다시 꺼내 볼 때마다 그때 그 마음으로.",
    Mock: PhotoMock,
  },
  {
    icon: CalendarDays,
    accent: "text-accent-cool",
    eyebrow: "함께 챙기는 일정",
    title: "엇갈리던 약속을, 같은 달력 위에서",
    desc:
      "쓰던 구글 캘린더를 그대로 불러와요. 새 일정은 두 사람의 달력에 동시에 들어가니, 기념일도 병원 예약도 누군가 혼자 기억하지 않아도 됩니다. 우리의 하루가 자연스레 맞춰져요.",
    Mock: CalendarMock,
  },
];

const TRUST = [
  {
    icon: RefreshCw,
    title: "같은 순간을 함께",
    desc: "한 사람의 기록이 상대 화면에 곧바로 떠올라요. 멀리 있어도 마음은 한 화면에.",
  },
  {
    icon: ShieldCheck,
    title: "우리 둘만의 공간",
    desc: "사진은 본인 Google Drive에, 가계는 부부만 볼 수 있게. 안심하고 솔직해질 수 있어요.",
  },
  {
    icon: Heart,
    title: "부부를 위해 태어났어요",
    desc: "혼자 쓰는 앱이 아니라, 두 사람이 함께 쓰도록 처음부터 설계했습니다.",
  },
];

export default async function Landing() {
  // 로그인 상태면 로고 클릭 시 대시보드로, 아니면 랜딩(현재 페이지)으로 이동.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const homeHref = user ? "/dashboard" : "/";

  return (
    <div className="relative mx-auto max-w-6xl px-5 pb-24">
      {/* ── Floating glass nav ── */}
      <nav className="sticky top-4 z-30 mt-4 flex items-center justify-between py-3">
        <Link href={homeHref} className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30 transition-transform duration-300 ease-out-back group-hover:scale-105">
            <Home className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">Our_Home</span>
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-accent/90 px-4 py-2 text-sm font-medium text-ink-900 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-accent"
        >
          시작하기
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto mt-24 max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          부부가 함께 쓰는 우리 집 다이어리
        </span>
        <h1 className="prose-ko mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-6xl">
          혼자 짊어지지 마세요,
          <br />
          <span className="bg-gradient-to-r from-accent-soft via-accent to-accent-cool bg-clip-text text-transparent">
            둘이 함께
          </span>{" "}
          꾸리는 우리 집.
        </h1>
        <p className="prose-ko mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
          오늘 아이에게 뭘 먹였는지, 이번 달 우리가 얼마를 썼는지, 함께 웃었던 그 순간까지.
          한 사람의 어깨에만 얹히지 않도록 두 사람이 같은 화면을 바라보며 기록하고, 함께 책임집니다.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-ink-900 shadow-bezel-lg transition-all duration-300 ease-out-back hover:scale-102 hover:shadow-2xl sm:w-auto"
          >
            우리 집 시작하기
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08] sm:w-auto"
          >
            이미 우리 집이 있어요
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">가입 1분 · 배우자 초대 한 번이면 끝</p>
      </section>

      {/* ── Hero preview (대표 목업) ── */}
      <section className="mx-auto mt-16 max-w-3xl animate-fade-up">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WalletMock />
          <BabyMock />
        </div>
      </section>

      {/* ── 기능별 상세 (목업 + 정서적 카피, 좌우 교차) ── */}
      <section id="features" className="mt-28 space-y-20 md:space-y-28">
        {FEATURES.map(({ icon: Icon, accent, eyebrow, title, desc, Mock }, i) => (
          <div
            key={title}
            className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12"
          >
            {/* 텍스트 */}
            <div className={i % 2 === 1 ? "md:order-2" : ""}>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
                <span className={`flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${accent}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {eyebrow}
              </span>
              <h3 className="prose-ko mt-4 text-2xl font-bold tracking-tight text-zinc-50 sm:text-[28px]">
                {title}
              </h3>
              <p className="prose-ko mt-4 text-base leading-relaxed text-zinc-400">{desc}</p>
            </div>
            {/* 목업 */}
            <div className={`animate-fade-up ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <Mock />
            </div>
          </div>
        ))}
      </section>

      {/* ── 신뢰 / 정서 포인트 ── */}
      <section className="mt-28 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {TRUST.map(({ icon: Icon, title, desc }) => (
          <GlassCard key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-accent-cool">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h3>
              <p className="prose-ko mt-1 text-sm leading-relaxed text-zinc-400">{desc}</p>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* ── Final CTA ── */}
      <section className="mt-20">
        <GlassCard className="overflow-hidden px-6 py-12 text-center sm:py-16">
          <h2 className="prose-ko text-2xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-3xl">
            오늘 하루도 수고했어요.
            <br />
            이제, 둘이 함께 나눠요.
          </h2>
          <p className="prose-ko mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            가계도, 육아도, 추억도. 무엇 하나 혼자 감당하지 않도록.
            우리 집을 만들고 배우자를 초대하는 데 1분이면 충분해요.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-ink-900 shadow-bezel-lg transition-all duration-300 ease-out-back hover:scale-102 hover:shadow-2xl sm:w-auto"
            >
              우리 집 시작하기
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-zinc-200 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08] sm:w-auto"
            >
              로그인
            </Link>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
