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
  /**
   * Placement on touch layouts, where the scatter becomes two banked columns.
   *
   * A phone has no room to put a card beside the copy — 42vw of card either
   * side of a 46ch paragraph does not fit — so the mobile layout does not try.
   * All eight cards bank above and below a clear centre band.
   *
   * Expressed as a side and a row rather than as x/y, because the cards are
   * anchored from the band edge outward and their height is set by their
   * content. `row` 0 is nearest the copy.
   */
  sm: { side: "left" | "right"; band: "above" | "below"; row: 0 | 1 };
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
    sm: { side: "left", band: "above", row: 1 },
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
    sm: { side: "right", band: "above", row: 1 },
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
    sm: { side: "left", band: "above", row: 0 },
    z: 4,
  },
  {
    kicker: "VECTOR",
    body: <span>family: &quot;tool-hijack&quot;</span>,
    tone: "light",
    stack: { x: 10, y: -4 },
    stackRotate: -2,
    target: { x: 36, y: 2, rotate: 0, w: 16, h: 14 },
    sm: { side: "right", band: "above", row: 0 },
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
    sm: { side: "left", band: "below", row: 0 },
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
    sm: { side: "right", band: "below", row: 0 },
    z: 7,
  },
  {
    kicker: "RISK CONTRACT",
    body: <span>maxNotional · allowedSymbols · maxOrders</span>,
    tone: "light",
    stack: { x: 16, y: 7 },
    stackRotate: 3,
    target: { x: 36, y: -17, rotate: 0, w: 17, h: 16 },
    sm: { side: "left", band: "below", row: 1 },
    z: 8,
  },
  {
    kicker: "SHIELD VETO",
    body: <span>rejected: size 420 &gt; maxNotional 100</span>,
    tone: "dark",
    stack: { x: -18, y: 12 },
    stackRotate: -7,
    target: { x: -36, y: 3, rotate: 0, w: 17, h: 16 },
    sm: { side: "right", band: "below", row: 1 },
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

/**
 * One card's visible surface, shared by both layouts so the two can never
 * drift apart in styling.
 *
 * `fill` clips to an imposed height, which is what the desktop scatter needs
 * — its cards are sized in vh and a long string must not push the box out of
 * its slot. Mobile passes false: there the height comes from the content, and
 * clipping would hide the very strings this section promises are real. That
 * is not hypothetical — at a fixed 17vh the risk-contract card rendered as
 * "maxNotional · allowedSymbols ·" with the last field cut off.
 */
function CardFace({ card, fill }: { card: EvidenceCard; fill: boolean }) {
  return (
    <div
      className={`flex w-full flex-col gap-[var(--spacing-8)] rounded-[var(--radius-cards)] border p-[var(--spacing-16)] ${fill ? "h-full overflow-hidden" : ""} ${TONE[card.tone]}`}
    >
      <div
        className={`font-mono text-[9px] uppercase tracking-[0.55px] ${KICKER_TONE[card.tone]}`}
      >
        {card.kicker}
      </div>
      <div className="font-mono text-[11px] leading-[1.5]">{card.body}</div>
    </div>
  );
}

/**
 * Half-height, in vh, of the centre band the mobile copy is confined to.
 *
 * The cards are flowed into the strips above and below it rather than being
 * positioned against it, so this is a cap on the copy only — but it is what
 * guarantees those strips exist at all. At the previous 40vw x 17vh, with
 * cards centred at y=±19, four of the eight were drawn straight through the
 * headline and paragraph.
 */
const SAFE_BAND = 20;

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
        {/*
          z-20, above the deck. On a phone the cards bank out of the centre
          band rather than behind the text, but the copy is the content here
          and must win any residual overlap — a 0.2vh rounding difference
          should cost a shadow, not a lost sentence.
        */}
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-[var(--spacing-32)] text-center md:z-[5]"
          style={{
            opacity: copy,
            transform: `scale(${reduced ? 1 : 0.9 + copy * 0.1})`,
            // Keep the block inside the band the cards bank away from. The
            // cards are anchored to this same constant, so the two cannot
            // drift apart.
            maxHeight: coarse ? `${SAFE_BAND * 2}vh` : undefined,
            marginTop: coarse ? "auto" : undefined,
            marginBottom: coarse ? "auto" : undefined,
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
          {/*
            The lower bound of the clamp drops to 26px on a phone. The copy and
            the two card bands together need 814 of 844px at 390x844, so the
            block has to give back what the bands cannot: at 32px the paragraph
            ran to six lines and the top band overlapped the heading by 25px.
          */}
          <h2 className="text-[clamp(26px,3.6vw,56px)] leading-[1.08] tracking-[-0.4px] text-obsidian sm:text-[clamp(32px,3.6vw,56px)] sm:leading-[1.05]">
            Adversarial Evaluation.
            <br />
            <span className="text-warm-sandstone">Real Proof.</span>
          </h2>
          <p className="mt-[var(--spacing-12)] max-w-[46ch] text-[13px] leading-[1.5] text-graphite sm:mt-[var(--spacing-24)] sm:text-body-sm sm:leading-relaxed">
            Every card behind this line is a real artifact: a line from the audit log,
            a codepoint the shield caught, a grade the harness assigned. Run{" "}
            <span className="font-mono text-obsidian">arka attack --demo</span> and you
            get the same strings.
          </p>
          <a
            href="/#quickstart"
            className="pointer-events-auto mt-[var(--spacing-16)] inline-flex h-11 items-center justify-center rounded-full bg-obsidian px-[var(--spacing-24)] text-body-sm text-pure-white transition-colors duration-200 hover:bg-charcoal sm:mt-[var(--spacing-32)]"
          >
            Get Started
          </a>
        </div>

        {/*
          The deck, in one of two layouts.

          These are structurally different, not one layout with different
          numbers, because the constraints differ in kind. Desktop has room to
          scatter cards around the copy and positions each absolutely. A phone
          does not: the copy alone is ~40% of the viewport, so the cards have
          to be *flowed* into the strips above and below it and allowed to size
          themselves.

          The absolute version was tried on mobile first and cannot work. Any
          offset large enough to clear the inner row puts the tallest card's
          top edge at 35px — under the 68px navbar — because a 121px card plus
          that offset exceeds the 422px half-viewport. Flowing the rows in a
          flex column makes the browser solve that, and no content change can
          push a card off-screen again.
        */}
        {coarse ? (
          // pt-[80px] clears the 68px sticky navbar: the deck sits inside a
          // `sticky top-0 h-screen` stage, so its first row would otherwise
          // start at y=0 and slide under the bar — which is where the JSONL
          // card lost its kicker.
          <div className="absolute inset-0 z-10 flex flex-col justify-between pb-[var(--spacing-16)] pt-[80px]">
            {(["above", "below"] as const).map((band) => (
              <div
                key={band}
                className="grid grid-cols-2 gap-[var(--spacing-8)] px-[var(--spacing-12)]"
                style={{
                  // Fades and lifts in with the same progress the desktop
                  // scatter uses, so the section still responds to scroll.
                  opacity: progress,
                  transform: `translateY(${(1 - progress) * (band === "above" ? -18 : 18)}px)`,
                }}
              >
                {CARDS.filter((c) => c.sm.band === band)
                  // Row 0 sits nearest the copy: for the upper band that means
                  // painting row 1 first, for the lower band row 0 first.
                  .sort((a, b) =>
                    band === "above" ? b.sm.row - a.sm.row : a.sm.row - b.sm.row,
                  )
                  .map((card) => (
                    <div
                      key={card.kicker}
                      className="spread-card"
                      style={{ gridColumn: card.sm.side === "left" ? 1 : 2 }}
                    >
                      <CardFace card={card} fill={false} />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 z-10">
            {CARDS.map((card, i) => {
              const depth = parallaxOn ? parallaxDepth(i, CARDS.length) : 0;

              const endRotate = reduced ? 0 : card.target.rotate;
              const rotate =
                card.stackRotate + (endRotate - card.stackRotate) * progress;
              const scale = 0.82 + (1 - 0.82) * progress;

              const x = card.stack.x + (card.target.x - card.stack.x) * progress;
              const y = card.stack.y + (card.target.y - card.stack.y) * progress;

              // Parallax scales with progress so the cluster never jitters
              // while it is still stacked.
              const drift = depth * progress;
              const dx = x - pointer.x * PARALLAX_X * drift;
              const dy = y - pointer.y * PARALLAX_Y * drift;

              return (
                <div
                  key={card.kicker}
                  className="spread-card absolute left-1/2 top-1/2"
                  style={{
                    width: `${card.target.w}vw`,
                    height: `${card.target.h}vh`,
                    zIndex: card.z,
                    transform: `translate(calc(-50% + ${dx}vw), calc(-50% + ${dy}vh)) rotate(${rotate}deg) scale(${scale})`,
                  }}
                >
                  <CardFace card={card} fill />
                </div>
              );
            })}
          </div>
        )}

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
