/**
 * 라우트 전환 중 즉시 표시되는 스켈레톤.
 * 셸(사이드바·탑바)은 layout 에 유지되고, 콘텐츠 영역만 이 폴백으로 대체된다.
 * 클릭 즉시 반응이 보여 "멈춘 느낌"을 없앤다.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl border border-white/5 bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-3xl border border-white/5 bg-white/[0.04]"
            style={{ opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
    </div>
  );
}
