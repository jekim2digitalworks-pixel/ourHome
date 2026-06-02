import Link from "next/link";
import { CalendarDays, Wallet, Baby, Images, Heart, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const FEATURES = [
  {
    icon: Wallet,
    title: "스마트 가계부",
    desc: "수입·지출을 즉시 기록하고, 고정비는 매월 자동 이월. 부동소수점 오차 없는 정수 기반 정산.",
  },
  {
    icon: Baby,
    title: "실시간 육아 차트",
    desc: "수유·배변·수면을 타임라인으로. 한 사람이 기록하면 다른 화면에 새로고침 없이 즉시 반영됩니다.",
  },
  {
    icon: Images,
    title: "함께 보는 사진첩",
    desc: "Google Drive에 안전하게 저장하고 링크만 보관. 날짜별 커버플로우로 추억을 넘겨보세요.",
  },
];

export default function Landing() {
  return (
    <div className="relative mx-auto max-w-6xl px-5 pb-24">
      {/* ── Floating glass nav ── */}
      <nav className="glass sticky top-4 z-30 mt-4 flex items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">Our_Home</span>
        </div>
        <div className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
          <a href="#features" className="transition-colors hover:text-zinc-100">기능</a>
          <a href="#features" className="transition-colors hover:text-zinc-100">소개</a>
        </div>
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
          부부를 위한 단 하나의 공동 관리 공간
        </span>
        <h1 className="prose-ko mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-6xl">
          두 사람의 하루를,
          <br />
          <span className="bg-gradient-to-r from-accent-soft via-accent to-accent-cool bg-clip-text text-transparent">
            하나의 홈
          </span>
          에서.
        </h1>
        <p className="prose-ko mx-auto mt-5 max-w-xl text-base text-zinc-400">
          캘린더, 가계부, 육아 기록, 사진첩까지. 흩어진 일상을 한 곳에 모아 실시간으로
          함께 관리하세요. 새로고침 없이, 두 화면이 언제나 같은 순간을 바라봅니다.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-ink-900 shadow-bezel-lg transition-all duration-300 ease-out-back hover:scale-102 hover:shadow-2xl"
          >
            대시보드 둘러보기
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* ── Feature cards (double-bezel) ── */}
      <section id="features" className="mt-28 grid grid-cols-1 gap-5 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <GlassCard
            key={title}
            interactive
            className="animate-fade-up"
          >
            <div style={{ animationDelay: `${i * 90}ms` }}>
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h3>
              <p className="prose-ko mt-2 text-sm text-zinc-400">{desc}</p>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* ── Calendar callout ── */}
      <section className="mt-6">
        <GlassCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-accent-cool">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-zinc-100">Google Calendar 연동</h3>
              <p className="prose-ko mt-1 text-sm text-zinc-400">
                기존 구글 일정을 그대로 가져오고, 새 일정은 양쪽 캘린더에 동시 반영됩니다.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-all duration-300 ease-out-back hover:scale-102 hover:bg-white/[0.08]"
          >
            연동 시작
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}
