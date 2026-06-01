import { ReactNode } from "react";

/**
 * Double-bezel glass surface. The wrapper carries the outer bezel + blur; the
 * inner `::before`-style ring is faked with a nested border for crisp edges.
 * Hover injects spring physics via `ease-out-back`, a micro scale and lift.
 */
export function GlassCard({
  children,
  className = "",
  interactive = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
}) {
  return (
    <Tag
      className={[
        "glass relative overflow-hidden p-5",
        // The second, inner bezel ring.
        "before:pointer-events-none before:absolute before:inset-px before:rounded-[15px] before:border before:border-white/[0.04]",
        interactive
          ? "cursor-pointer transition-all duration-300 ease-out-back hover:-translate-y-1 hover:scale-102 hover:bg-white/[0.09] hover:shadow-bezel-lg"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-accent">
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h3>
          {hint && <p className="text-xs text-zinc-500">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
