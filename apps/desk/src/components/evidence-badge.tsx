"use client";

import { useState } from "react";
import { usePrefersReducedMotion } from "./motion";
import { CORPUS } from "@/lib/facts";

/**
 * A pill holding a heavily-overlapped stack of tiles that fans out on hover.
 *
 * Ported from the reference `images-badge` component. Two substantive changes:
 *
 *   - The reference uses `framer-motion` for the spring. This app has no
 *     animation dependency, and the whole effect is x/y/rotate/opacity/scale
 *     on a handful of tiles, so a CSS `transition` with a spring-ish
 *     cubic-bezier is indistinguishable in motion and free in bundle size.
 *   - The reference shows photographs. These tiles are the six attack
 *     families, each labelled with its real vector count from lib/facts.ts,
 *     so the badge reports the corpus instead of decorating around it.
 *
 * Keyboard and touch users get the expanded state too: hover alone would hide
 * the content from them entirely, so focus-within opens it and the whole pill
 * is a button that toggles.
 */

/** Tile geometry, in px, per size. */
const SIZES = {
  sm: { tile: 30, gap: 7, pill: "h-9 pl-[6px] pr-[14px] gap-[8px] text-[11px]" },
  md: { tile: 40, gap: 9, pill: "h-11 pl-[8px] pr-[16px] gap-[10px] text-[12px]" },
  lg: { tile: 52, gap: 11, pill: "h-14 pl-[10px] pr-[20px] gap-[12px] text-[14px]" },
} as const;

/**
 * Hand-placed angles. Index 0 is the back of the stack. The clustered angles
 * are wider than the fanned ones, so opening the stack also straightens it —
 * that combination is what makes it read as a deck being dealt rather than a
 * row sliding apart.
 */
const REST_ROTATE = [-14, -7, -2, 5, 11, -9] as const;
const OPEN_ROTATE = [-6, -3, -1, 2, 5, -4] as const;

/** Tint per family — same palette the rest of the page assigns these ideas. */
const TINTS = [
  "#a8927c", // homoglyph: sandstone
  "#839cb2", // hidden-text: slate blue
  "#79648c", // tool-hijack: dusty iris
  "#a8927c", // semantic-trap
  "#839cb2", // look-ahead
  "#79648c", // sentiment-filter
] as const;

/**
 * Parabolic lift: the outer tiles sit lower than the centre ones when fanned,
 * so the open row arcs instead of running flat.
 */
function arcY(i: number, total: number, tile: number): number {
  if (total <= 1) return 0;
  const mid = (total - 1) / 2;
  const t = (i - mid) / mid;
  return t * t * (tile * 0.2);
}

/** Two-letter mark for a family id, so a tile reads at 40px. */
const MARKS: Record<string, string> = {
  homoglyph: "HG",
  "hidden-text": "HT",
  "tool-hijack": "TH",
  "semantic-trap": "ST",
  "look-ahead": "LA",
  "sentiment-filter": "SF",
};

export function EvidenceBadge({
  size = "md",
  maxVisible = 3,
  label,
  className = "",
}: {
  size?: keyof typeof SIZES;
  /** Tiles shown while collapsed; the rest hide behind them. */
  maxVisible?: number;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();

  const { tile, gap, pill } = SIZES[size];
  const families = CORPUS.families;
  const total = families.length;

  // Collapsed: each tile peeks out by a third of its width, and everything
  // past `maxVisible` hides directly behind the last visible tile.
  const peek = Math.round(tile * 0.34);
  const collapsedW = tile + (Math.min(maxVisible, total) - 1) * peek;
  const openW = total * tile + (total - 1) * gap;

  // Reduced motion resolves to the open state — it is the one that conveys
  // all six families — and simply never transitions between the two.
  const expanded = reduced || open;

  const collapsedX = (i: number) =>
    i >= maxVisible ? (maxVisible - 1) * peek : i * peek;
  const openX = (i: number) => i * (tile + gap);

  const ease = "cubic-bezier(0.22, 1.2, 0.36, 1)";

  return (
    <button
      type="button"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={expanded}
      aria-label={`${CORPUS.vectorCount} attack vectors across ${total} families`}
      className={`inline-flex select-none items-center rounded-full border border-bone bg-pure-white/90 backdrop-blur-sm transition-shadow duration-300 hover:shadow-subtle ${pill} ${className}`}
    >
      <div
        className="relative shrink-0"
        style={{
          height: tile + 10,
          width: expanded ? openW : collapsedW,
          transition: reduced ? "none" : `width 0.45s ${ease}`,
        }}
      >
        {families.map((family, i) => {
          const hidden = i >= maxVisible;
          const x = expanded ? openX(i) : collapsedX(i);
          const y = expanded ? arcY(i, total, tile) : 0;
          const rotate = reduced
            ? 0
            : expanded
              ? (OPEN_ROTATE[i] ?? 0)
              : (REST_ROTATE[i] ?? 0);
          // Hidden tiles are invisible and shrunken while clustered, so the
          // collapsed pill reads as three tiles, not six overlapping ones.
          const opacity = hidden && !expanded ? 0 : 1;
          const scale = hidden && !expanded ? 0.6 : 1;
          // Front tile on top while collapsed; natural order once fanned.
          const z = expanded ? i + 1 : total - i;

          return (
            <span
              key={family.id}
              title={`${family.label}: ${family.count} vectors`}
              className="absolute left-0 top-[5px] flex items-center justify-center rounded-[10px] border-2 border-pure-white font-mono text-[10px] text-pure-white"
              style={{
                width: tile,
                height: tile,
                background: TINTS[i] ?? "#575757",
                zIndex: z,
                opacity,
                transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
                transition: reduced
                  ? "none"
                  : `transform 0.45s ${ease}, opacity 0.3s linear`,
                transitionDelay:
                  !reduced && hidden && expanded ? `${(i - maxVisible) * 55}ms` : "0ms",
              }}
            >
              {MARKS[family.id] ?? family.count}
            </span>
          );
        })}
      </div>

      <span className="whitespace-nowrap text-graphite">
        {label ?? `${CORPUS.vectorCount} vectors · ${total} families`}
      </span>
    </button>
  );
}
