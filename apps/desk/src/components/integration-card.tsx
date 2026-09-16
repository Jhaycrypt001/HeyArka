"use client";

import { useId, useRef } from "react";
import { useScrollProgress, usePrefersReducedMotion } from "./motion";
import { CORPUS, SHIELDED } from "@/lib/facts";
import { ArkaGlyph } from "./glyphs";
import { Eyebrow } from "./ui";

/**
 * The integration card: six attack families wired into one shield.
 *
 * This is the "integration card" pattern from the reference — a dotted
 * substrate, peripheral nodes, and animated pulses travelling connector paths
 * into a centre mark. Rebuilt on this project's tokens rather than pasted:
 * the reference version is a shadcn component (`cn()`, `Card`,
 * `class-variance-authority`, `@base-ui/react`, `motion/react`), and this app
 * has none of those. Porting the look costs one file; porting the toolchain
 * would cost four dependencies and a CSS-variable scheme that fights the
 * existing one.
 *
 * The pulse animation is pure CSS `stroke-dashoffset` on a keyframe, so it
 * needs no animation library and stops dead under `prefers-reduced-motion`.
 *
 * The nodes are the six real attack families from lib/facts.ts, and each
 * carries its true vector count. The centre is the shield. The figure is
 * therefore the actual corpus topology, not decoration.
 */

/** Node geometry in the 564x410 viewBox the paths are authored against. */
interface Node {
  id: string;
  label: string;
  count: number;
  /** Position in viewBox units. */
  x: number;
  y: number;
  /** Connector path from the centre mark out to the node. */
  path: string;
  /** Seconds of stagger, so the pulses don't fire in lockstep. */
  delay: number;
}

/*
 * Centre of the mark is (282, 205). Paths leave the mark's edge — not its
 * centre — so the stroke is never drawn underneath the centre tile. Each is
 * an orthogonal run with a quarter-round corner, matching the reference's
 * circuit-trace geometry.
 *
 * The six families and their counts are read from CORPUS rather than typed in,
 * so a corpus change moves this diagram instead of silently outdating it.
 */
const FAMILY_GEOMETRY: ReadonlyArray<Omit<Node, "label" | "count">> = [
  { id: "homoglyph", x: 110, y: 90, path: "M 270 190 V 105 Q 270 90 255 90 H 110", delay: 0 },
  { id: "hidden-text", x: 380, y: 70, path: "M 294 190 V 85 Q 294 70 309 70 H 380", delay: 0.55 },
  { id: "tool-hijack", x: 150, y: 205, path: "M 250 205 H 150", delay: 1.1 },
  { id: "semantic-trap", x: 440, y: 205, path: "M 314 205 H 440", delay: 1.65 },
  { id: "look-ahead", x: 200, y: 340, path: "M 270 220 V 325 Q 270 340 255 340 H 200", delay: 2.2 },
  { id: "sentiment-filter", x: 430, y: 340, path: "M 314 220 V 325 Q 314 340 329 340 H 430", delay: 2.75 },
];

const NODES: Node[] = FAMILY_GEOMETRY.map((geo) => {
  const family = CORPUS.families.find((f) => f.id === geo.id);
  if (!family) {
    // A corpus rename must fail loudly at build time, not render a blank node.
    throw new Error(`integration-card: no corpus family with id "${geo.id}"`);
  }
  return { ...geo, label: family.label, count: family.count };
});

const VIEW_W = 564;
const VIEW_H = 410;

/**
 * One connector: a static hairline plus a travelling pulse.
 *
 * The pulse is a short dash on a long gap, animated by `stroke-dashoffset`.
 * `pathLength="1"` normalises every path to a unit length, so one keyframe
 * set drives connectors of wildly different real lengths at the same
 * apparent speed — otherwise the short middle runs would pulse far faster
 * than the long cornered ones.
 */
function Connector({
  d,
  gradientId,
  delay,
  animate,
}: {
  d: string;
  gradientId: string;
  delay: number;
  animate: boolean;
}) {
  return (
    <>
      <path d={d} stroke="rgba(255,255,255,0.13)" strokeWidth="1" fill="none" />
      <path
        d={d}
        pathLength={1}
        stroke={`url(#${gradientId})`}
        strokeWidth="1.75"
        fill="none"
        strokeLinecap="round"
        className={animate ? "connector-pulse" : undefined}
        style={animate ? { animationDelay: `${delay}s` } : { opacity: 0.45 }}
        strokeDasharray={animate ? undefined : "0.08 0.92"}
      />
    </>
  );
}

export function IntegrationCard() {
  const uid = useId().replace(/:/g, "");
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(sectionRef);
  const reduced = usePrefersReducedMotion();

  // Nodes settle in as the section arrives. Under reduced motion
  // `useScrollProgress` pins to 0.5, which puts every node fully settled.
  const entry = Math.min(1, Math.max(0, (progress - 0.1) / 0.35));

  return (
    <section
      ref={sectionRef}
      id="corpus-map"
      className="bg-obsidian py-[var(--spacing-128)]"
    >
      <div className="page-rail">
        <div className="mx-auto max-w-[1100px] overflow-hidden rounded-[var(--radius-feature-panels)] border border-white/10">
          {/* Visual half. */}
          <div className="relative aspect-[564/460] w-full bg-white/[0.02] sm:aspect-[564/410]">
            {/* Dotted substrate. */}
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Vignette, so the connectors fade out rather than hit the edge. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-obsidian/70 via-transparent to-obsidian/70" />

            {/* Connectors. */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              fill="none"
              aria-hidden="true"
            >
              <defs>
                {NODES.map((node) => (
                  <linearGradient
                    key={node.id}
                    id={`${uid}-${node.id}`}
                    gradientUnits="objectBoundingBox"
                  >
                    <stop offset="0%" stopColor="#a8927c" stopOpacity="0" />
                    <stop offset="50%" stopColor="#a8927c" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#a8927c" stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {NODES.map((node) => (
                <Connector
                  key={node.id}
                  d={node.path}
                  gradientId={`${uid}-${node.id}`}
                  delay={node.delay}
                  animate={!reduced}
                />
              ))}
            </svg>

            {/* Centre mark — the shield. */}
            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex items-center justify-center rounded-[var(--radius-nested-cards)] border border-white/20 bg-obsidian p-[var(--spacing-8)] sm:rounded-[var(--radius-cards)] sm:p-[var(--spacing-12)]">
                <div className="rounded-[8px] border border-white/15 p-[var(--spacing-8)] sm:p-[var(--spacing-12)]">
                  <ArkaGlyph
                    className="h-5 w-5 text-pure-white sm:h-8 sm:w-8"
                    title="@heyarka/shield"
                  />
                </div>
                {!reduced && (
                  <span className="pointer-events-none absolute inset-0 rounded-[var(--radius-nested-cards)] border border-warm-sandstone/40 sm:rounded-[var(--radius-cards)] shield-halo" />
                )}
              </div>
            </div>

            {/* Peripheral nodes. */}
            {NODES.map((node, i) => {
              const appear = Math.min(1, Math.max(0, (entry - i * 0.07) / 0.3));
              return (
                <div
                  key={node.id}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${(node.x / VIEW_W) * 100}%`,
                    top: `${(node.y / VIEW_H) * 100}%`,
                    opacity: appear,
                    transition: "opacity 0.4s linear",
                  }}
                >
                  <div className="flex flex-col items-center gap-[var(--spacing-8)]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-nested-cards)] border border-white/20 bg-white/[0.06] font-mono text-[13px] text-pure-white backdrop-blur-[2px] sm:h-12 sm:w-12 sm:text-[15px]">
                      {node.count}
                    </div>
                    <span className="whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.5px] text-white/45 sm:text-[9px]">
                      {node.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Copy half. */}
          <div className="flex flex-col gap-[var(--spacing-24)] border-t border-white/10 p-[var(--spacing-32)] sm:p-[var(--spacing-48)]">
            <div className="flex flex-col gap-[var(--spacing-12)]">
              <Eyebrow tone="light">One import, six families</Eyebrow>
              <h3 className="text-subheading-sm text-pure-white sm:text-subheading">
                Every vector arrives at the same shield.
              </h3>
              <p className="max-w-[62ch] text-body-sm leading-relaxed text-white/55">
                {CORPUS.vectorCount} vectors across {CORPUS.familyCount} families run
                against your agent, then the same {CORPUS.vectorCount} run again with{" "}
                <span className="font-mono text-white/80">@heyarka/shield</span> in front
                of it. Susceptibility falls to{" "}
                <span className="text-pure-white">
                  {SHIELDED.injectionSusceptibility}
                </span>
                . The vectors it does not stop are listed by name. The scorecard is not
                a marketing surface.
              </p>
            </div>
            <a
              href="/#quickstart"
              className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-pure-white px-[var(--spacing-20)] text-body-sm text-obsidian transition-colors duration-200 hover:bg-pale-stone"
            >
              Run it against your agent
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
