"use client";

import { useRef } from "react";
import { useScrollProgress } from "./motion";
import { ButtonFilled } from "./ui";

/**
 * The pale-stone panel that rises over the preceding section, with a field of
 * thumbnails drifting at three different parallax rates.
 *
 * Every thumbnail is a REAL artifact rendered as DOM — a JSONL line, a
 * scorecard grade, a shield veto, a canary tick — never a stock image and
 * never generated art. They're small, monospaced and factual, which is also
 * what makes them legible at thumbnail size.
 */

interface Thumb {
  /**
   * Horizontal anchor. Cards on the right half anchor from the RIGHT edge:
   * `left: 90%` with a fixed pixel width puts the card's far edge past the
   * viewport (1152px + 150px on a 1280 rail), which clipped every right-hand
   * thumbnail. Anchoring by side keeps both edges inside the frame at any
   * width, and the parallax still only moves them vertically.
   */
  readonly side: "left" | "right";
  readonly id: string;
  /** Percent inset from the anchored edge. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  /** Parallax depth: 0.3 = far/slow, 1.0 = near/fast. */
  readonly depth: number;
  readonly tone: "white" | "dark" | "accent";
  readonly title: string;
  readonly body: string;
}

const THUMBS: readonly Thumb[] = [
  {
    id: "jsonl",
    side: "left",
    x: 2,
    y: 8,
    w: 190,
    depth: 0.4,
    tone: "dark",
    title: "results.jsonl",
    body: '{"vectorId":"homoglyph-ticker-cyrillic","succeeded":true}',
  },
  {
    id: "grade-c",
    side: "left",
    x: 14,
    y: 58,
    w: 128,
    depth: 1,
    tone: "white",
    title: "unshielded",
    body: "C · 31.3%",
  },
  {
    id: "veto",
    side: "left",
    x: 2,
    y: 76,
    w: 178,
    depth: 0.65,
    tone: "white",
    title: "shield veto",
    body: "risk contract rejected size 400 > max 100",
  },
  {
    id: "canary",
    side: "left",
    x: 19,
    y: 24,
    w: 166,
    depth: 0.75,
    tone: "white",
    title: "canary tick",
    body: "control=buy/15 shielded=buy/15",
  },
  {
    id: "codepoint",
    side: "right",
    x: 8,
    y: 10,
    w: 184,
    depth: 0.55,
    tone: "dark",
    title: "codepoint diff",
    body: "U+0422 ≠ U+0054",
  },
  {
    id: "grade-b",
    side: "right",
    x: 14,
    y: 56,
    w: 128,
    depth: 1,
    tone: "accent",
    title: "shielded",
    body: "B · 12.5%",
  },
  {
    id: "mcp",
    side: "right",
    x: 15,
    y: 79,
    w: 170,
    depth: 0.45,
    tone: "white",
    title: "@heyarka/mcp",
    body: "arka_attack · arka_score · arka_shield",
  },
  {
    id: "vector",
    side: "right",
    x: 2,
    y: 32,
    w: 150,
    depth: 0.85,
    tone: "white",
    title: "vector",
    body: 'family: "tool-hijack"',
  },
  {
    id: "held",
    side: "left",
    x: 28,
    y: 80,
    w: 146,
    depth: 0.6,
    tone: "white",
    title: "terminal",
    body: "[04/16] hidden-text-bidi  held",
  },
  {
    id: "contract",
    side: "right",
    x: 34,
    y: 62,
    w: 162,
    depth: 0.5,
    tone: "white",
    title: "risk contract",
    body: "maxNotional · allowedSymbols · maxOrders",
  },
];

function ThumbCard({ thumb, offset }: { thumb: Thumb; offset: number }) {
  const palette =
    thumb.tone === "dark"
      ? "bg-obsidian text-white/75"
      : thumb.tone === "accent"
        ? "bg-forest-sovereignty text-white/85"
        : "bg-pure-white text-graphite";
  const titleColor =
    thumb.tone === "white" ? "text-smoke" : "text-white/45";

  return (
    <div
      className={`absolute rounded-[var(--radius-nested-cards)] p-[var(--spacing-16)] ${palette}`}
      style={{
        [thumb.side]: `${thumb.x}%`,
        top: `${thumb.y}%`,
        width: thumb.w,
        transform: `translate3d(0, ${offset}px, 0)`,
        willChange: "transform",
      }}
      aria-hidden="true"
    >
      <div className={`font-mono text-[10px] uppercase tracking-[0.55px] ${titleColor}`}>
        {thumb.title}
      </div>
      <div className="mt-[var(--spacing-8)] break-words font-mono text-[11px] leading-[1.5]">
        {thumb.body}
      </div>
    </div>
  );
}

export function FloatingPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);

  // Centre the drift on the resting mid-point so reduced-motion (pinned at
  // 0.5) lands exactly where the layout was designed.
  const drift = (progress - 0.5) * 2;

  return (
    <section
      ref={ref}
      className="relative -mt-[var(--spacing-64)] overflow-hidden rounded-t-[var(--radius-feature-panels)] bg-pale-stone"
    >
      {/*
        The tall min-height exists to give the parallax field room, but that
        field is hidden below `lg` — leaving ~700px of empty grey on a phone.
        Height is therefore only reserved at the width that actually uses it.
      */}
      <div className="relative py-[var(--spacing-96)] lg:min-h-[720px] lg:py-[var(--spacing-160)]">
        {/*
          Parallax field — hidden on small screens where it would collide.
          Inset from the section edges so a card positioned near 100% still has
          room for its own height plus the parallax drift without being clipped
          by the section boundary.
        */}
        <div className="pointer-events-none absolute inset-x-0 top-[var(--spacing-40)] bottom-[var(--spacing-96)] hidden lg:block">
          {THUMBS.map((thumb) => (
            <ThumbCard key={thumb.id} thumb={thumb} offset={drift * thumb.depth * -70} />
          ))}
        </div>

        <div className="page-rail relative flex flex-col items-center text-center">
          <h2
            data-reveal
            className="max-w-[760px] text-[clamp(34px,5.2vw,64px)] leading-[1.05] tracking-[-0.64px]"
          >
            <span className="block text-obsidian">Adversarial Evaluation.</span>
            <span className="block text-warm-sandstone">Real Proof.</span>
          </h2>
          <div data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <ButtonFilled
              href="#quickstart"
              tone="light"
              className="mt-[var(--spacing-40)] px-[var(--spacing-32)]"
            >
              Get Started
            </ButtonFilled>
          </div>
        </div>
      </div>
    </section>
  );
}
