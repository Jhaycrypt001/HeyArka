"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion, useScrollProgress } from "./motion";
import { SHIELDED } from "@/lib/facts";

/**
 * The five shield stages, animated: a hostile headline enters at the top and
 * is visibly rewritten as it descends through each stage.
 *
 * This replaces the static `ShieldWireframe` in the shield band. The static
 * version listed the five stages and showed the before/after strings side by
 * side, which stated the outcome without showing the work. Here the same five
 * real stages run in sequence and the string itself changes at the stage that
 * actually changes it:
 *
 *   01  NFKC + CONFUSABLES      ТSLA -> TSLA   (Cyrillic U+0422 -> Latin U+0054)
 *   02  ZERO-WIDTH / BIDI STRIP removes the U+200B between "hal" and "ts"
 *   03  PROVENANCE GATE         1 source -> below the corroboration floor
 *   04  POINT-IN-TIME GUARD     drops the post-decision timestamp
 *   05  RISK CONTRACT           emits order: HOLD
 *
 * Every string is the real transformation the shield performs — the Cyrillic
 * Т really is U+0422, and the zero-width character below really is U+200B.
 *
 * Driven by `useScrollProgress`, already rAF-batched. Under reduced motion
 * that hook pins to 0.5, which would freeze the pipeline half-run, so this
 * component reads `usePrefersReducedMotion` directly and shows every stage
 * resolved instead.
 */

interface Stage {
  id: string;
  label: string;
  /** What the payload looks like *after* this stage has run. */
  after: string;
  /** What this stage did, in the tool's own terms. */
  note: string;
  /** Marks the stage that emits the final decision. */
  terminal?: boolean;
}

/**
 * The payload entering the pipeline. The Т is Cyrillic U+0422 and there is a
 * real zero-width space (U+200B) inside "halts" — both are written as escapes
 * so they survive editors, linters and copy-paste review rather than looking
 * like ordinary text that someone might "tidy up".
 */
const CYRILLIC_T = "Т";
const ZERO_WIDTH = "​";
const RAW = `${CYRILLIC_T}SLA hal${ZERO_WIDTH}ts guidance`;

const STAGES: Stage[] = [
  {
    id: "01",
    label: "NFKC + CONFUSABLES",
    after: `TSLA hal${ZERO_WIDTH}ts guidance`,
    note: "U+0422 → U+0054",
  },
  {
    id: "02",
    label: "ZERO-WIDTH / BIDI STRIP",
    after: "TSLA halts guidance",
    note: "U+200B removed",
  },
  {
    id: "03",
    label: "PROVENANCE GATE",
    after: "TSLA halts guidance",
    note: "1 source · below floor",
  },
  {
    id: "04",
    label: "POINT-IN-TIME GUARD",
    after: "TSLA halts guidance",
    note: "no post-decision data",
  },
  {
    id: "05",
    label: "RISK CONTRACT",
    after: "order: HOLD",
    note: `${SHIELDED.injectionSusceptibility} flipped`,
    terminal: true,
  },
];

const ACCENT = "#839cb2";
const SAND = "#a8927c";

/**
 * Renders a string with any invisible characters made visible. A zero-width
 * space is the entire point of stage 02, so showing it as nothing would hide
 * the one thing the stage does.
 */
function Payload({ text, dim }: { text: string; dim: boolean }) {
  const parts = text.split(ZERO_WIDTH);

  return (
    <span className={dim ? "text-white/40" : "text-white/85"}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              className="mx-[1px] rounded-[2px] px-[3px] align-middle text-[8px]"
              style={{ background: "rgba(168,146,124,0.25)", color: SAND }}
              title="U+200B zero-width space"
            >
              ZWSP
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/**
 * True once the element has been scrolled into view at least once. The
 * pipeline should run when the reader arrives at it, and then stay run —
 * re-playing it on every scroll-by would be noise.
 */
function useHasEntered(ref: React.RefObject<HTMLElement | null>): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setEntered(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return entered;
}

export function ShieldPipeline({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scroll = useScrollProgress(rootRef);
  const entered = useHasEntered(rootRef);
  const reduced = usePrefersReducedMotion();

  // Timed run rather than scroll-scrubbed: the five stages are a sequence with
  // a beginning and an end, and scrubbing them backwards on an upward scroll
  // would read as the shield un-sanitizing the headline.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (reduced || !entered) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      setElapsed(t);
      // 0.62s per stage plus a beat at the end.
      if (t < STAGES.length * 0.62 + 0.6) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [entered, reduced]);

  // How far the run has progressed, in stages. Reduced motion shows the
  // finished pipeline; `scroll` still parallaxes the rail below.
  const runhead = reduced ? STAGES.length : elapsed / 0.62;

  // The whole card lifts and settles as the band scrolls through. Small
  // numbers on purpose: this is a floating panel, not a parallax ride, and
  // anything larger reads as drift rather than elevation.
  const lift = (scroll - 0.5) * -28;

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      style={{ perspective: "1600px" }}
    >
      {/*
        Soft cast shadow. It is a separate blurred element rather than a
        `box-shadow` because the card sits on a pure-black band, where a
        conventional dark shadow is invisible — the only thing that reads as
        elevation here is a faint sandstone bloom under the card.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[6%] bottom-[-18px] top-[12%] rounded-[var(--radius-cards)] blur-[26px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 100%, rgba(168,146,124,0.22) 0%, transparent 70%)",
          opacity: reduced ? 0.7 : 0.4 + Math.min(1, runhead / STAGES.length) * 0.5,
          transform: `translateY(${lift * 0.4}px)`,
        }}
      />

      {/* The floating card itself. */}
      <div
        className="relative rounded-[var(--radius-cards)] border border-white/12 p-[var(--spacing-24)]"
        style={{
          // A genuine surface, not a tint: the gradient gives the panel a
          // lit top edge so it reads as a physical card under the band light.
          background:
            "linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.008) 100%)",
          boxShadow:
            "0 28px 60px -24px rgba(0,0,0,0.9), inset 0 1px 0 0 rgba(255,255,255,0.08)",
          transform: reduced ? "none" : `translateY(${lift}px)`,
          willChange: reduced ? undefined : "transform",
        }}
      >
        {/* The payload entering the pipeline. */}
        <div className="mb-[var(--spacing-16)] flex items-baseline justify-between gap-[var(--spacing-16)] border-b border-white/10 pb-[var(--spacing-12)]">
          <span className="font-mono text-[9px] uppercase tracking-[0.6px] text-white/35">
            Ingest
          </span>
          <span className="font-mono text-[11px] text-white/85">
            <Payload text={RAW} dim={false} />
          </span>
        </div>

        <ol className="relative flex flex-col gap-[var(--spacing-8)]">
          {STAGES.map((stage, i) => {
          // Each stage fades and slides in as the runhead passes it.
          const local = Math.min(1, Math.max(0, runhead - i));
          const done = local >= 1;
          const active = local > 0 && local < 1;
          const tint = stage.terminal ? ACCENT : "rgba(255,255,255,0.72)";

          return (
            <li
              key={stage.id}
              className="relative rounded-[var(--radius-nested-cards)] border px-[var(--spacing-16)] py-[var(--spacing-12)]"
              style={{
                borderColor: active
                  ? SAND
                  : done
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.07)",
                background: active ? "rgba(168,146,124,0.06)" : "rgba(255,255,255,0.02)",
                opacity: 0.25 + local * 0.75,
                transform: `translateY(${(1 - local) * 8}px)`,
                transition: reduced ? "none" : "border-color 0.3s linear, background 0.3s linear",
              }}
            >
              <div className="flex items-center justify-between gap-[var(--spacing-16)]">
                <div className="flex items-center gap-[var(--spacing-12)]">
                  <span className="font-mono text-[8px] tracking-[0.6px] text-white/30">
                    {stage.id}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-[0.7px]"
                    style={{ color: tint }}
                  >
                    {stage.label}
                  </span>
                </div>
                <span className="font-mono text-[8px] tracking-[0.5px] text-white/35">
                  {stage.note}
                </span>
              </div>

              <div className="mt-[var(--spacing-8)] font-mono text-[11px]">
                <Payload text={stage.after} dim={!done} />
              </div>

              {/* Connector to the next stage, drawn only once this one is done. */}
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-full z-[1] block w-px -translate-x-1/2"
                  style={{
                    height: "8px",
                    background: done ? SAND : "rgba(255,255,255,0.12)",
                    transition: reduced ? "none" : "background 0.3s linear",
                  }}
                />
              )}
              </li>
            );
          })}
        </ol>

        {/* Accessible summary. The animation is decorative over this text. */}
        <span className="sr-only">
          The shield runs five deterministic stages. A headline containing a Cyrillic
          U+0422 in place of a Latin T, and a zero-width space inside &quot;halts&quot;,
          is normalized, stripped, checked for corroboration and point-in-time
          integrity, and resolved by the risk contract to order: HOLD. Shielded
          injection susceptibility {SHIELDED.injectionSusceptibility}.
        </span>
      </div>
    </div>
  );
}
