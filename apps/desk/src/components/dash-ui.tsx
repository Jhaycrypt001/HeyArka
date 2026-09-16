import type { ReactNode } from "react";

/**
 * Dashboard primitives.
 *
 * Server components with no client JS. They follow DESIGN.md's rule that
 * elevation comes from tone and spacing rather than shadow, so the panels are
 * flat surfaces separated by a hairline border.
 *
 * Every size here is fluid or wraps: the dashboard is read on a phone as often
 * as on a desk, and a metric rail that scrolls sideways is a broken rail.
 */

/** Section wrapper with a mono label and an optional right-aligned aside. */
export function Panel({
  label,
  aside,
  children,
  className = "",
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-cards)] border border-bone bg-pure-white ${className}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-[var(--spacing-8)] border-b border-bone px-[var(--spacing-20)] py-[var(--spacing-16)] sm:px-[var(--spacing-24)]">
        <h2 className="font-mono text-micro-label uppercase tracking-[0.55px] text-smoke">
          {label}
        </h2>
        {aside !== undefined && <div className="text-[11px] text-smoke">{aside}</div>}
      </header>
      <div className="p-[var(--spacing-20)] sm:p-[var(--spacing-24)]">{children}</div>
    </section>
  );
}

/**
 * A single metric. `delta` is rendered only when supplied, and its tone is
 * passed in rather than inferred from the sign: for injection rate a fall is
 * good, for human-takeover rate a rise is good, and guessing would mislabel
 * one of them.
 */
export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad" | "accent";
}) {
  const color =
    tone === "good"
      ? "text-forest-sovereignty"
      : tone === "bad"
        ? "text-warm-sandstone"
        : tone === "accent"
          ? "text-slate-blue"
          : "text-obsidian";

  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase leading-[1.4] tracking-[0.55px] text-smoke [overflow-wrap:anywhere]">
        {label}
      </div>
      <div
        className={`mt-[var(--spacing-8)] text-[clamp(22px,5vw,34px)] leading-[1.05] tracking-[-0.5px] [overflow-wrap:anywhere] ${color}`}
      >
        {value}
      </div>
      {sub !== undefined && (
        <div className="mt-[var(--spacing-4)] text-[11px] leading-[1.5] text-graphite">{sub}</div>
      )}
    </div>
  );
}

/** Large letter grade with its scale printed beside it. */
export function GradeMark({
  grade,
  caption,
  tone,
}: {
  grade: string;
  caption: string;
  tone: "bare" | "shielded";
}) {
  const color = tone === "bare" ? "text-warm-sandstone" : "text-forest-sovereignty";
  const ring = tone === "bare" ? "border-warm-sandstone/35" : "border-forest-sovereignty/30";
  return (
    <div className="flex items-center gap-[var(--spacing-16)]">
      <div
        className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[var(--radius-nested-cards)] border ${ring}`}
      >
        <span className={`text-[34px] leading-none ${color}`}>{grade}</span>
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
          {tone === "bare" ? "Unshielded" : "Shielded"}
        </div>
        <div className="mt-[2px] text-[12px] leading-[1.5] text-graphite">{caption}</div>
      </div>
    </div>
  );
}

/**
 * A proportion bar. Width is a percentage of `total`, so an empty bar is a
 * real zero rather than a hidden element, and the count is always printed as
 * a number beside it because a 1/16 bar is nearly invisible on a phone.
 */
export function Bar({
  value,
  total,
  tone = "bad",
}: {
  value: number;
  total: number;
  tone?: "bad" | "good" | "accent";
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const bg =
    tone === "good"
      ? "bg-forest-sovereignty"
      : tone === "accent"
        ? "bg-slate-blue"
        : "bg-warm-sandstone";
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-pale-stone">
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Small status pill. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "bad" | "accent";
}) {
  const palette =
    tone === "good"
      ? "border-forest-sovereignty/30 text-forest-sovereignty"
      : tone === "bad"
        ? "border-warm-sandstone/45 text-warm-sandstone"
        : tone === "accent"
          ? "border-slate-blue/45 text-slate-blue"
          : "border-bone text-graphite";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[var(--spacing-8)] py-[2px] font-mono text-[10px] uppercase tracking-[0.5px] ${palette}`}
    >
      {children}
    </span>
  );
}
