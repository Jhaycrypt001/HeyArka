"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "./motion";
import { TextCursorProximity } from "./text-cursor-proximity";
import { UNSHIELDED, SHIELDED } from "@/lib/facts";
import { Eyebrow } from "./ui";

/**
 * The layered-plane scroll section.
 *
 * Geometry taken from the reference video (frames at t=5.5s through t=8.5s),
 * which I was finally able to decode. The earlier build here had the
 * mechanism wrong in three ways, all corrected below:
 *
 *   - The planes are UPRIGHT sheets seen at an angle — rotated about Y, not
 *     laid flat about X. The previous `rotateX(62deg)` made them read as
 *     stacked pancakes viewed edge-on; in the reference they face the viewer
 *     and are turned ~28 degrees, so each full face stays readable.
 *   - They separate along a DIAGONAL depth axis, travelling down-and-left
 *     toward the viewer as they come forward, staying parallel and still
 *     overlapping. The previous version fanned them straight up.
 *   - The stack is weighted to the RIGHT with the copy beside it on the left,
 *     rather than centred under a heading.
 *
 * The planes are not decoration. Each one is a real stage of the pipeline and
 * carries real numbers from lib/facts.ts, so the thing that separates under
 * the cursor is the actual corpus -> shield -> scorecard path. Depth is done
 * with CSS 3D transforms driven by the existing `useScrollProgress` hook,
 * which is already rAF-batched and already pins to a legible resting state
 * under `prefers-reduced-motion` — so no animation dependency is added.
 */

const STROKE = "rgba(255,255,255,0.5)";
const STROKE_DIM = "rgba(255,255,255,0.18)";
const ACCENT = "#839cb2";
const SAND = "#a8927c";

/**
 * Contour overlay: concentric rounded rings, as on the reference planes.
 * Deterministic geometry — no randomness, so server and client agree and the
 * figure is stable between renders.
 */
function Contours({ seed, tint }: { seed: number; tint: string }) {
  const rings = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    return {
      x: 40 + t * 26 + seed * 8,
      y: 26 + t * 18,
      w: 320 - t * 150 - seed * 12,
      h: 150 - t * 74,
      r: 46 - t * 20,
      o: 0.4 - t * 0.05,
    };
  });

  return (
    <svg
      viewBox="0 0 420 210"
      className="absolute inset-0 h-full w-full"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {/* Grid substrate. */}
      <g stroke={STROKE_DIM} strokeWidth="0.4">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 30} x2="420" y2={i * 30} />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={i * 42} y1="0" x2={i * 42} y2="210" />
        ))}
      </g>

      {/* Contour rings. */}
      <g fill="none" strokeWidth="0.7">
        {rings.map((ring, i) => (
          <rect
            key={i}
            x={ring.x}
            y={ring.y}
            width={Math.max(ring.w, 20)}
            height={Math.max(ring.h, 16)}
            rx={Math.max(ring.r, 4)}
            stroke={tint}
            opacity={ring.o}
          />
        ))}
      </g>
    </svg>
  );
}

/** Binary tick labels along the plane edge, as in the reference screenshots. */
function TickLabels({ bits }: { bits: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[6px] flex justify-between px-[10px] font-mono text-[7px] tracking-[0.6px] text-white/25">
      {bits.split(" ").map((b, i) => (
        <span key={i}>{b}</span>
      ))}
    </div>
  );
}

interface Plane {
  id: string;
  label: string;
  metric: string;
  caption: string;
  tint: string;
  bits: string;
}

/**
 * The four planes, in pipeline order. Every metric is read from lib/facts.ts,
 * which records only figures produced by actually running the tool.
 */
const PLANES: Plane[] = [
  {
    id: "01",
    label: "INGEST",
    metric: `${UNSHIELDED.vectorsRun} VECTORS`,
    caption: "Headlines enter unverified.",
    tint: STROKE,
    bits: "0100 1101 0010 1110",
  },
  {
    id: "02",
    label: "ATTACK",
    metric: `${UNSHIELDED.injectionSusceptibility} FLIPPED`,
    caption: "The corpus rewrites them.",
    tint: SAND,
    bits: "1011 0110 1001 0011",
  },
  {
    id: "03",
    label: "SHIELD",
    metric: `${SHIELDED.injectionSusceptibility} FLIPPED`,
    caption: "Five deterministic stages.",
    tint: ACCENT,
    bits: "0011 1010 0101 1100",
  },
  {
    id: "04",
    label: "SCORECARD",
    metric: `${UNSHIELDED.grade} → ${SHIELDED.grade}`,
    caption: "Signed, append-only.",
    tint: ACCENT,
    bits: "1101 0011 1110 0101",
  },
];

/**
 * True below Tailwind's `md`. Starts false so the server render and the first
 * client render agree — a width-dependent initial value would hydrate-mismatch
 * — then corrects on mount.
 */
function useCompact(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    setCompact(query.matches);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return compact;
}

export function LayeredPlanes() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(sectionRef);
  const compact = useCompact();

  // `useScrollProgress` returns 0.5 at rest under reduced motion, which is
  // exactly the half-separated state — legible, and identical every frame.
  const spread = Math.min(1, Math.max(0, (progress - 0.15) / 0.6));

  return (
    <section
      ref={sectionRef}
      id="pipeline"
      className="relative overflow-hidden bg-obsidian py-[var(--spacing-128)]"
    >
      <div className="page-rail lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-center lg:gap-[var(--spacing-64)]">
        <div className="max-w-[620px]">
          <Eyebrow tone="light">The path a headline takes</Eyebrow>
          {/*
            The heading reacts to the cursor letter by letter. It sits on the
            black band where the sandstone highlight reads strongest, and it
            is the one heading a reader is already pointing at while they
            scrub the planes apart.
          */}
          <h2 className="mt-[var(--spacing-24)] text-heading-sm text-pure-white md:text-heading">
            <TextCursorProximity
              label="Four layers between a headline and an order."
              radius={130}
              falloff="gaussian"
              from={{ color: "rgba(255,255,255,0.92)", scale: 1, letterSpacing: "0px" }}
              to={{ color: SAND, scale: 1.18, letterSpacing: "0.6px" }}
            />
          </h2>
          <p className="mt-[var(--spacing-24)] text-body-sm text-white/55">
            Scroll to separate them. Every number on these planes came from{" "}
            <span className="font-mono text-white/80">arka attack --demo</span>, not from a
            mockup.
          </p>
        </div>

        {/* The stack. Perspective lives on the wrapper so children share one
            vanishing point rather than each getting their own. The origin sits
            left of centre, which is what tips the right-hand edges away from
            the viewer the way the reference does. */}
        <div
          className="relative mx-auto mt-[var(--spacing-64)] h-[420px] w-full max-w-[860px] md:h-[520px] lg:mt-0"
          style={{ perspective: "1400px", perspectiveOrigin: "30% 50%" }}
        >
          {PLANES.map((plane, i) => {
            // Index 0 is the front sheet (nearest the viewer); `depth` counts
            // backwards into the screen. As `spread` grows each sheet slides
            // along the diagonal the reference uses — forward in z, and
            // down-and-left in the picture plane — so the stack opens like a
            // hand of cards being drawn rather than a column lifting.
            const depth = i;
            const travel = compact ? 46 : 92;
            const t = depth * spread;

            const x = -t * travel * 0.72;
            const y = t * travel * 0.46;
            const z = -depth * 90 + t * 70;

            // The whole stack turns slightly flatter as it opens, which is
            // what stops the rear sheets from foreshortening into slivers.
            const rotateY = 28 - spread * 7;
            const scale = 1 - depth * 0.02;
            // Front sheet brightest; the rear ones stay legible but recede.
            const opacity = 0.9 - depth * 0.16;

            return (
              <div
                key={plane.id}
                className="absolute left-[8%] top-1/2 w-[76%] max-w-[560px]"
                style={{
                  transform: `translate3d(${x}px, ${y - 105}px, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                  transformStyle: "preserve-3d",
                  // Front sheet paints last so it sits over the ones behind.
                  zIndex: PLANES.length - i,
                  opacity,
                  transition: "opacity 0.4s linear",
                }}
              >
                <div className="relative h-[250px] overflow-hidden rounded-[var(--radius-nested-cards)] border border-white/15 bg-white/[0.035] backdrop-blur-[1px] md:h-[290px]">
                  <Contours seed={i} tint={plane.tint} />

                  {/* Plane header. */}
                  <div className="absolute left-[14px] top-[12px] flex items-center gap-[var(--spacing-8)]">
                    <span className="font-mono text-[8px] tracking-[0.6px] text-white/35">
                      {plane.id}
                    </span>
                    <span
                      className="font-mono text-[9px] tracking-[0.8px]"
                      style={{ color: plane.tint }}
                    >
                      {plane.label}
                    </span>
                  </div>

                  <div className="absolute right-[14px] top-[12px] font-mono text-[9px] tracking-[0.6px] text-white/70">
                    {plane.metric}
                  </div>

                  <TickLabels bits={plane.bits} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Captions fade in as the planes separate — the text reveal from the
            reference, tied to the same progress value. Spans both columns of
            the outer grid; left in the first column it would be crushed into
            the 340px copy rail. */}
        <div className="mt-[var(--spacing-64)] grid gap-[var(--spacing-24)] sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
          {PLANES.map((plane, i) => {
            const appear = Math.min(1, Math.max(0, (spread - i * 0.12) / 0.3));
            return (
              <div
                key={plane.id}
                style={{
                  opacity: appear,
                  transform: `translateY(${(1 - appear) * 14}px)`,
                }}
              >
                <div
                  className="font-mono text-micro-label uppercase tracking-[0.55px]"
                  style={{ color: plane.tint }}
                >
                  {plane.label}
                </div>
                <div className="mt-[var(--spacing-8)] text-body-sm text-pure-white">
                  {plane.metric}
                </div>
                <p className="mt-[var(--spacing-4)] text-[13px] leading-[1.6] text-white/45">
                  {plane.caption}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
