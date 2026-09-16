"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "./motion";
import { UNSHIELDED, SHIELDED, CORPUS } from "@/lib/facts";

/**
 * Stack-spread: a clustered deck of evidence cards that scatters as the
 * section scrolls, revealing the headline behind it.
 *
 * Ported from the reference component's mechanism, not its contents. The
 * original scatters eight stock photographs; photographs would be the exact
 * "AI slop" this project exists to argue against, so every card here is a
 * real artifact the tool actually emits — a JSONL line from the audit log,
 * a codepoint diff, the shield's veto reason, the two grades. If a judge
 * reads a card and then runs `arka attack --demo`, they see the same string.
 *
 * Mechanism differences from the reference, all forced by this codebase:
 *
 *   - `motion/react` (useScroll/useTransform/useSpring) is not a dependency
 *     here and is not worth adding for one section. The scroll driver is a
 *     local rAF-batched listener measuring the sticky wrapper, which is the
 *     same technique `useScrollProgress` already uses — but that hook maps
 *     progress across the viewport, whereas a sticky stage needs progress
 *     *within its own scroll length*, so it cannot be reused directly.
 *   - Positions are interpolated in JS and written as inline transforms
 *     rather than as motion values.
 *   - Pointer parallax is kept, since it is cheap and it is what makes the
 *     scattered state feel like depth instead of a static grid.
 */

interface EvidenceCard {
  /** Mono kicker at the top of the card. */
  kicker: string;
  /** Card body — kept short; these are read in peripheral vision. */
  body: ReactNode;
  /** Surface treatment. */
  tone: "light" | "dark" | "forest";
  /** Offset (vw/vh) while clustered. */
  stack: { x: number; y: number };
  /** Angle while clustered, degrees. */
  stackRotate: number;
  /** Final position (vw/vh) and size (vw/vh) on desktop. */
  target: { x: number; y: number; rotate: number; w: number; h: number };
  /** Final x/y on touch layouts, where the scatter becomes a column. */
  targetSm: { x: number; y: number };
  /** Paint order; higher sits on top. */
  z: number;
}

/**
 * Array order is stack order, back to front. Every string below is copied
 * from real output: the JSONL line is a record from reports/, the codepoints
 * are the actual Cyrillic/Latin pair the homoglyph vector substitutes, and
 * the grades come from lib/facts.ts.
 */
const CARDS: EvidenceCard[] = [
  {
    kicker: "RESULTS.JSONL",
    body: (
      <span className="break-all">
        {'{"vectorId":"homoglyph-ticker-cyrillic","succeeded":true}'}
      </span>
    ),
    tone: "dark",
    stack: { x: -8, y: -10 },
    stackRotate: -18,
    target: { x: -36, y: -30, rotate: 0, w: 17, h: 21 },
    targetSm: { x: -22, y: -40 },
    z: 2,
  },
  {
    kicker: "CODEPOINT DIFF",
    body: (
      <span>
        U+0422 <span className="opacity-50">≠</span> U+0054
      </span>
    ),
    tone: "dark",
    stack: { x: 14, y: -10 },
    stackRotate: 20,
    target: { x: 35, y: -34, rotate: 0, w: 17, h: 14 },
    targetSm: { x: 22, y: -40 },
    z: 3,
  },
  {
    kicker: "CANARY TICK",
    body: (
      <>
        control=buy/15
        <br />
        shielded=buy/15
      </>
    ),
    tone: "light",
    stack: { x: -16, y: 0 },
    stackRotate: -4,
    target: { x: -36, y: -13, rotate: 0, w: 16, h: 15 },
    targetSm: { x: -22, y: -19 },
    z: 4,
  },
  {
    kicker: "VECTOR",
    body: <span>family: &quot;tool-hijack&quot;</span>,
    tone: "light",
    stack: { x: 10, y: -4 },
    stackRotate: -2,
    target: { x: 36, y: 2, rotate: 0, w: 16, h: 14 },
    targetSm: { x: 22, y: -19 },
    z: 5,
  },
  {
    kicker: "UNSHIELDED",
    body: (
      <span>
        {UNSHIELDED.grade} · {UNSHIELDED.injectionSusceptibility}
      </span>
    ),
    tone: "light",
    stack: { x: -12, y: 4 },
    stackRotate: 6,
    target: { x: -36, y: 28, rotate: 0, w: 15, h: 13 },
    targetSm: { x: -22, y: 20 },
    z: 6,
  },
  {
    kicker: "SHIELDED",
    body: (
      <span>
        {SHIELDED.grade} · {SHIELDED.injectionSusceptibility}
      </span>
    ),
    tone: "forest",
    stack: { x: 8, y: 10 },
    stackRotate: 6,
    target: { x: 36, y: 30, rotate: 0, w: 15, h: 13 },
    targetSm: { x: 22, y: 20 },
    z: 7,
  },
  {
    kicker: "RISK CONTRACT",
    body: <span>maxNotional · allowedSymbols · maxOrders</span>,
    tone: "light",
    stack: { x: 16, y: 7 },
    stackRotate: 3,
    target: { x: 36, y: -17, rotate: 0, w: 17, h: 16 },
    targetSm: { x: -22, y: 40 },
    z: 8,
  },
  {
    kicker: "SHIELD VETO",
    body: <span>rejected: size 420 &gt; maxNotional 100</span>,
    tone: "dark",
    stack: { x: -18, y: 12 },
    stackRotate: -7,
    target: { x: -36, y: 3, rotate: 0, w: 17, h: 16 },
    targetSm: { x: 22, y: 40 },
    z: 9,
  },
];

/** Scroll progress at which the cluster starts and finishes scattering. */
const SCATTER_START = 0.12;
const SCATTER_END = 0.9;

/**
 * When the centre copy fades in, as a fraction of the *scatter* progress (not
 * raw scroll). Every card must be clear of the copy's safe zone before the
 * first pixel of the headline is visible, so this deliberately trails the
 * scatter rather than overlapping it.
 */
const COPY_START = 0.88;
const COPY_SPAN = 0.12;

const PARALLAX_X = 2.6;
const PARALLAX_Y = 2.2;

/** Back cards drift least, front cards most — that difference is the depth. */
const parallaxDepth = (i: number, total: number) =>
  total <= 1 ? 1 : 0.55 + (i / (total - 1)) * 0.75;

/**
 * Touch vs. mouse rather than raw width: a narrow mouse-driven window (a
 * split editor, a devtools-squeezed viewport) still has the pointer needed
 * for the parallax and the room for the scatter. Only real touch devices
 * collapse to the two-column layout.
 */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    setCoarse(query.matches);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return coarse;
}

/**
 * Progress (0-1) through a sticky section's own scroll length: 0 while its
 * top is at or below the viewport top, 1 once it has been scrolled by its
 * full extra height.
 *
 * This is deliberately NOT `useScrollProgress`, which measures an element
 * crossing the whole viewport. A sticky stage is pinned for its entire
 * travel, so viewport-crossing progress would be pinned too.
 */
function useStickyProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      // Fully scattered: the cards are the content, so the resting state must
      // be the readable one, not the pile.
      setProgress(1);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // Travel is the section's height minus the one viewport it stays pinned
      // for. Guard against a zero/negative span on very short viewports.
      const span = rect.height - window.innerHeight;
      if (span <= 0) {
        setProgress(1);
        return;
      }
      setProgress(Math.min(1, Math.max(0, -rect.top / span)));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, reduced]);

  return progress;
}

/** Normalised pointer position, -1..1 on each axis, 0,0 when idle. */
function usePointer(enabled: boolean): { x: number; y: number } {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setPos({ x: 0, y: 0 });
      return;
    }

    let frame = 0;
    let next = { x: 0, y: 0 };

    const flush = () => {
      frame = 0;
      setPos(next);
    };

    const onMove = (event: PointerEvent) => {
      next = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      next = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  return pos;
}

const TONE: Record<EvidenceCard["tone"], string> = {
  light: "bg-pure-white text-obsidian border-bone",
  dark: "bg-obsidian text-pure-white border-white/15",
  forest: "bg-forest-sovereignty text-pure-white border-white/15",
};

const KICKER_TONE: Record<EvidenceCard["tone"], string> = {
  light: "text-graphite",
  dark: "text-white/45",
  forest: "text-white/55",
};

/** Scroll distance the scatter is spread over, in vh. */
const SCROLL_LENGTH = 300;

export function StackSpread() {
  const wrapRef = useRef<HTMLElement>(null);
  const raw = useStickyProgress(wrapRef);
  const coarse = useCoarsePointer();
  const reduced = usePrefersReducedMotion();

  // Hold clustered, scatter, then hold scattered — so the deck is legible at
  // both ends rather than only at the exact midpoint of the section.
  const progress = Math.min(
    1,
    Math.max(0, (raw - SCATTER_START) / (SCATTER_END - SCATTER_START)),
  );

  const parallaxOn = !reduced && !coarse;
  const pointer = usePointer(parallaxOn && progress > 0.98);

  // Centre copy fades in only once the cards have essentially finished
  // clearing out. Starting it mid-flight (it used to begin at 0.3) meant the
  // headline was drawn *underneath* cards that were still crossing the middle,
  // which is what clipped "Adversarial Evaluation" during the unfold. A
  // full-sweep check of all eight cards at 401 progress values across seven
  // viewports is clean only from COPY_START onward — see the safe zone note
  // on the copy block below.
  const copy = Math.min(1, Math.max(0, (progress - COPY_START) / COPY_SPAN));

  return (
    <section
      ref={wrapRef}
      id="evidence-deck"
      className="relative w-full bg-soft-mist"
      style={{ height: `${SCROLL_LENGTH}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Centre copy. */}
        <div
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-[var(--spacing-32)] text-center"
          style={{
            opacity: copy,
            transform: `scale(${reduced ? 1 : 0.9 + copy * 0.1})`,
          }}
        >
          {/*
            Capped at 56px rather than a bare 5vw. At 5vw "Adversarial
            Evaluation." measures ~860px at a 1440px viewport, which is wider
            than the gap left between the two scattered card columns — so the
            line was being overlapped no matter where the cards landed. The
            clamp keeps the widest line inside the ~600-720px safe zone at
            every viewport from 1280px up.
          */}
          <h2 className="text-[clamp(32px,3.6vw,56px)] leading-[1.05] tracking-[-0.4px] text-obsidian">
            Adversarial Evaluation.
            <br />
            <span className="text-warm-sandstone">Real Proof.</span>
          </h2>
          <p className="mt-[var(--spacing-24)] max-w-[46ch] text-body-sm leading-relaxed text-graphite">
            Every card behind this line is a real artifact: a line from the audit log,
            a codepoint the shield caught, a grade the harness assigned. Run{" "}
            <span className="font-mono text-obsidian">arka attack --demo</span> and you
            get the same strings.
          </p>
          <a
            href="/#quickstart"
            className="pointer-events-auto mt-[var(--spacing-32)] inline-flex h-11 items-center justify-center rounded-full bg-obsidian px-[var(--spacing-24)] text-body-sm text-pure-white transition-colors duration-200 hover:bg-charcoal"
          >
            Get Started
          </a>
        </div>

        {/* The deck. */}
        <div className="absolute inset-0 z-10">
          {CARDS.map((card, i) => {
            const depth = parallaxOn ? parallaxDepth(i, CARDS.length) : 0;

            // Touch layouts resolve to a two-column grid instead of a scatter;
            // a 40vw card at a scattered x would run off the screen.
            const endX = coarse ? card.targetSm.x : card.target.x;
            const endY = coarse ? card.targetSm.y : card.target.y;
            const endRotate = coarse || reduced ? 0 : card.target.rotate;

            const x = card.stack.x + (endX - card.stack.x) * progress;
            const y = card.stack.y + (endY - card.stack.y) * progress;

            // Parallax scales with progress so the cluster never jitters while
            // it is still stacked.
            const drift = depth * progress;
            const dx = x - pointer.x * PARALLAX_X * drift;
            const dy = y - pointer.y * PARALLAX_Y * drift;

            const rotate =
              card.stackRotate + (endRotate - card.stackRotate) * progress;
            const scale = 0.82 + (1 - 0.82) * progress;

            const w = coarse ? 40 : card.target.w;
            const h = coarse ? 17 : card.target.h;

            return (
              <div
                key={card.kicker}
                className="spread-card absolute left-1/2 top-1/2"
                style={{
                  width: `${w}vw`,
                  height: `${h}vh`,
                  zIndex: card.z,
                  transform: `translate(calc(-50% + ${dx}vw), calc(-50% + ${dy}vh)) rotate(${rotate}deg) scale(${scale})`,
                }}
              >
                <div
                  className={`flex h-full w-full flex-col gap-[var(--spacing-8)] overflow-hidden rounded-[var(--radius-cards)] border p-[var(--spacing-16)] ${TONE[card.tone]}`}
                >
                  <div
                    className={`font-mono text-[9px] uppercase tracking-[0.55px] ${KICKER_TONE[card.tone]}`}
                  >
                    {card.kicker}
                  </div>
                  <div className="font-mono text-[11px] leading-[1.5]">{card.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll hint, gone by the time the scatter begins. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[4vh] z-20 flex flex-col items-center gap-[var(--spacing-8)] font-mono text-micro-label uppercase text-graphite"
          style={{ opacity: Math.max(0, 1 - raw / SCATTER_START) }}
        >
          <span>Scroll</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <span className="sr-only">
        {CORPUS.vectorCount} attack vectors across {CORPUS.familyCount} families.
        Unshielded grade {UNSHIELDED.grade} at {UNSHIELDED.injectionSusceptibility}{" "}
        injection susceptibility; shielded grade {SHIELDED.grade} at{" "}
        {SHIELDED.injectionSusceptibility}.
      </span>
    </section>
  );
}
