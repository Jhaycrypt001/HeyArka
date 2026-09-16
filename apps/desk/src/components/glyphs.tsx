/**
 * Hand-authored SVG. Nothing here is generated art.
 *
 * All icons are single-family, mono-stroke, thin-weight geometry per
 * DESIGN.md ("no multicolor icon sets"). Strokes are 1px at nominal size and
 * use `currentColor` so a parent can tint them.
 */

export function ArkaGlyph({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {/*
        Three bars of unequal height, read as a diff: the same agent run twice,
        with the middle column standing clear of its neighbours. Squared ends,
        flat fill, no radius — it survives a 16px favicon because there is
        nothing in it that can turn to mud.

        Heights and offsets are set so the silhouette is asymmetric at any size;
        an evenly-stepped rail reads as a generic chart icon instead.
      */}
      <rect x="3" y="9" width="4" height="12" fill="currentColor" />
      <rect x="9.5" y="5.5" width="4" height="15.5" fill="currentColor" />
      <rect x="16" y="3" width="4" height="14" fill="currentColor" />
    </svg>
  );
}

/**
 * The full lockup: the diff mark plus the wordmark.
 *
 * The final `a` is drawn hollow rather than solid. That is the homoglyph tell —
 * the last character looks like the others until you look at it, which is the
 * entire attack class this tool exists to catch. It is a brand idea that is
 * also the thesis, so it is worth the extra span.
 *
 * `size` scales the mark and the type together; the two are optically matched
 * at each size rather than derived by a ratio, because a mark that is
 * mathematically proportional to cap height reads as too small next to
 * lowercase letterforms.
 */
export function WordMark({
  className = "",
  size = "sm",
  title,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  const mark = size === "lg" ? "h-7 w-7" : size === "md" ? "h-6 w-6" : "h-5 w-5";
  const type = size === "lg" ? "text-[26px]" : size === "md" ? "text-[22px]" : "text-[20px]";
  const gap = size === "lg" ? "gap-[var(--spacing-12)]" : "gap-[var(--spacing-8)]";

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      <ArkaGlyph className={mark} title={title} />
      <span className={`${type} lowercase tracking-[-0.2px] leading-none`}>
        heyark
        {/*
          Hollow `a`: transparent fill with a 1px stroke of the inherited colour.
          `-webkit-text-stroke` is the only way to outline live text without
          converting it to a path, and it is supported everywhere this ships.
          The fallback if it is ignored is a normal solid `a`, which is a
          degraded lockup rather than a broken one.
        */}
        <span
          className="[-webkit-text-stroke:1px_currentColor]"
          style={{ color: "transparent" }}
        >
          a
        </span>
      </span>
    </span>
  );
}

export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6.5 8 10.5 12 6.5" />
    </svg>
  );
}

export function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 4 10.5 8 6.5 12" />
    </svg>
  );
}

/** The small filled arrow that precedes every mono eyebrow label. */
export function EyebrowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" className={className} fill="currentColor" aria-hidden="true">
      <path d="M0 0h8L0 8z" />
    </svg>
  );
}

export function IconTrendingUp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

export function IconBarChart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 20V12" />
      <path d="M12 20V4" />
      <path d="M19 20v-5" />
    </svg>
  );
}

export function IconOverlap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      <circle cx="9.5" cy="12" r="6" />
      <circle cx="14.5" cy="12" r="6" />
    </svg>
  );
}

export function IconTerminal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9.5l2.5 2.5L7 14.5" />
      <path d="M13 15h4" />
    </svg>
  );
}

export function IconGitBranch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="5.5" r="2.5" />
      <circle cx="7" cy="18.5" r="2.5" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M7 8v8" />
      <path d="M17 12c0 3.5-3 4.5-7 4.5" />
    </svg>
  );
}

export function IconShield({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 2.8v5.6c0 4.2-2.9 7.6-7 8.6-4.1-1-7-4.4-7-8.6V5.8L12 3z" />
    </svg>
  );
}

export function IconPlug({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8z" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function IconPulse({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12h4l2.5-6 4 12 2.5-6h7" />
    </svg>
  );
}

export function IconGitHub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.16.58.67.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
    </svg>
  );
}

export function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.53 3h3.06l-6.69 7.64L21.75 21h-5.98l-4.7-6.14L5.7 21H2.63l7.16-8.18L2.25 3h6.13l4.25 5.62L17.53 3zm-1.07 16.2h1.7L7.62 4.72H5.8l10.66 14.48z" />
    </svg>
  );
}
