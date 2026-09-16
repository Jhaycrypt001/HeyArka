import type { ReactNode } from "react";
import { ChevronRight, EyebrowMark } from "./glyphs";

/**
 * Mono micro-label with the small filled arrow, per DESIGN.md's
 * "Section Heading Stack": 11px uppercase, +0.55px tracking.
 */
export function Eyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  const color = tone === "light" ? "text-smoke" : "text-graphite";
  return (
    <div
      className={`flex items-center gap-[var(--spacing-8)] font-mono text-micro-label uppercase ${color} ${className}`}
    >
      <EyebrowMark className="h-[7px] w-[7px]" />
      <span>{children}</span>
    </div>
  );
}

/** Filled black CTA. Inverts to white-on-black inside dark sections. */
export function ButtonFilled({
  children,
  href,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  href: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const palette =
    tone === "light"
      ? "bg-pure-white text-obsidian hover:bg-pale-stone"
      : "bg-obsidian text-pure-white hover:bg-charcoal";
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-[var(--radius-buttons)] px-[var(--spacing-16)] py-[var(--spacing-12)] text-body-sm transition-colors duration-200 ${palette} ${className}`}
    >
      {children}
    </a>
  );
}

/** Quiet outlined action — DESIGN.md's "Outlined Login Button". */
export function ButtonOutlined({
  children,
  href,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  href: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const palette =
    tone === "light"
      ? "border-white/35 text-pure-white hover:border-white/70"
      : "border-silhouette text-smoke hover:text-obsidian hover:border-graphite";
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-[var(--radius-buttons)] border px-[var(--spacing-16)] py-[var(--spacing-8)] text-body-sm transition-colors duration-200 ${palette} ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * The CTA from the sandstone band: a black pill with a white chevron square
 * fused to its right end.
 */
export function ButtonWithChevron({
  children,
  href,
  className = "",
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-[var(--spacing-16)] rounded-[var(--radius-buttons)] bg-obsidian py-[var(--spacing-4)] pl-[var(--spacing-16)] pr-[var(--spacing-4)] text-body-sm text-pure-white transition-colors duration-200 hover:bg-charcoal ${className}`}
    >
      <span>{children}</span>
      <span className="flex h-7 w-8 items-center justify-center rounded-[6px] bg-pure-white text-obsidian transition-transform duration-200 group-hover:translate-x-[2px]">
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

/**
 * Flat feature card: white (or tinted), 16px radius, NO shadow, 32px padding.
 * DESIGN.md is explicit that elevation comes from tone and spacing only.
 */
export function FlatCard({
  children,
  surface = "white",
  className = "",
}: {
  children: ReactNode;
  surface?: "white" | "mist" | "bone";
  className?: string;
}) {
  const bg =
    surface === "mist"
      ? "bg-soft-mist"
      : surface === "bone"
        ? "bg-bone"
        : "bg-pure-white";
  return (
    <div
      className={`rounded-[var(--radius-cards)] p-[var(--card-padding)] ${bg} ${className}`}
    >
      {children}
    </div>
  );
}

/** Rounded chip holding a mono-stroke icon — used on the benchmark cards. */
export function IconChip({
  children,
  surface = "white",
  className = "",
}: {
  children: ReactNode;
  surface?: "white" | "bone";
  className?: string;
}) {
  const bg = surface === "bone" ? "bg-bone" : "bg-pure-white";
  return (
    <div
      className={`flex h-[52px] w-[52px] items-center justify-center rounded-[var(--radius-nested-cards)] ${bg} ${className}`}
    >
      {children}
    </div>
  );
}

/** Categorical tag chip from the bento grid: small mark + 11px mono label. */
export function TagChip({
  label,
  accent = "#212121",
  onImage = false,
}: {
  label: string;
  accent?: string;
  onImage?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-[var(--spacing-8)]">
      <span
        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px]"
        style={{ background: accent }}
      >
        <EyebrowMark className="h-[7px] w-[7px] text-white/90" />
      </span>
      <span
        className={`font-mono text-micro-label uppercase ${onImage ? "text-pure-white" : "text-graphite"}`}
      >
        {label}
      </span>
    </div>
  );
}
