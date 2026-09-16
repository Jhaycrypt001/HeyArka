"use client";

import { useRef } from "react";
import { Eyebrow } from "./ui";
import { CorpusWireframe } from "./wireframes";
import { ShieldPipeline } from "./shield-pipeline";
import { useScrollProgress } from "./motion";
import { UNSHIELDED, SHIELDED, CORPUS } from "@/lib/facts";

/**
 * The two black-void bands. Text alternates sides between them, matching the
 * reference; the wireframe occupies the opposite half and draws itself on as
 * the section reveals.
 */
function VoidBand({
  id,
  eyebrow,
  heading,
  body,
  stats,
  illustration,
  side,
}: {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  stats: ReadonlyArray<{ value: string; label: string }>;
  illustration: React.ReactNode;
  side: "left" | "right";
}) {
  const textFirst = side === "left";

  /*
   * Asymmetric padding on purpose. Both void bands are the same black surface,
   * so a symmetric `py` on each stacks two full gaps at the seam where the eye
   * reads only one — which is what left ~400px of dead space between them.
   * Top padding carries the rhythm; bottom is half.
   */
  return (
    <section id={id} className="bg-obsidian pt-[var(--spacing-96)] pb-[var(--spacing-48)]">
      <div className="page-rail">
        <div className="grid items-center gap-[var(--spacing-64)] lg:grid-cols-2">
          <div
            data-reveal
            className={textFirst ? "lg:order-1" : "lg:order-2"}
            style={{ ["--reveal-delay" as string]: "0ms" }}
          >
            <Eyebrow tone="light">{eyebrow}</Eyebrow>
            <h2 className="mt-[var(--spacing-24)] max-w-[460px] text-[clamp(26px,3.4vw,36px)] leading-[1.1] tracking-[-0.36px] text-pure-white">
              {heading}
            </h2>
            <p className="mt-[var(--spacing-24)] max-w-[440px] text-body-sm leading-[1.6] text-white/60">
              {body}
            </p>
            <dl className="mt-[var(--spacing-40)] flex flex-wrap gap-[var(--spacing-40)]">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-mono text-micro-label uppercase text-white/40">
                    {stat.label}
                  </dt>
                  <dd className="mt-[var(--spacing-8)] text-[28px] leading-none text-pure-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            data-reveal
            className={textFirst ? "lg:order-2" : "lg:order-1"}
            style={{ ["--reveal-delay" as string]: "120ms" }}
          >
            {illustration}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AttackVoid() {
  return (
    <VoidBand
      id="attacks"
      side="left"
      eyebrow="The attack"
      heading="Sixteen vectors. Six families. None of them look like an attack."
      body="Homoglyph substitution, hidden-text clauses, tool-call hijacks, semantic traps, look-ahead probes and sentiment-filter poisoning, reproduced from the published literature and run against your agent in one command."
      stats={[
        { value: String(CORPUS.vectorCount), label: "Vectors" },
        { value: String(CORPUS.familyCount), label: "Families" },
        { value: UNSHIELDED.grade, label: "Demo grade" },
      ]}
      illustration={<CorpusWireframe className="h-auto w-full" />}
    />
  );
}

export function ShieldVoid() {
  return (
    <VoidBand
      id="shield"
      side="right"
      eyebrow="The shield"
      heading="Five deterministic steps between the headline and the order."
      body="NFKC normalization and confusables mapping, zero-width and bidi stripping, provenance corroboration, a point-in-time guard, and a risk contract that can veto any order the model proposes. The LLM never touches credentials."
      stats={[
        { value: SHIELDED.grade, label: "Shielded grade" },
        { value: SHIELDED.injectionSusceptibility, label: "Injection rate" },
        { value: SHIELDED.riskViolation, label: "Risk violations" },
      ]}
      illustration={<ShieldPipeline className="w-full" />}
    />
  );
}

/**
 * The accent stat card: a forest-green field sliding in from the right while
 * an adjacent tile enters from the left, driven by scroll progress.
 */
export function StatCard() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);

  // Progress runs 0→1 across the whole viewport traversal; the slide should
  // resolve by the time the section is centred, so remap 0.15→0.55 to 0→1.
  const t = Math.min(1, Math.max(0, (progress - 0.15) / 0.4));
  const eased = 1 - Math.pow(1 - t, 3);
  const cardShift = (1 - eased) * 64;
  const tileShift = (1 - eased) * -64;

  // Opacity is driven separately and never reaches 0. Tying it to `eased`
  // outright meant the whole section was invisible whenever it sat below the
  // fold — including in a screenshot taken from the top of the page — and a
  // section that can render blank is a section that can ship blank.
  const fade = 0.35 + eased * 0.65;

  return (
    /*
     * `overflow-x-clip` is load-bearing, not cosmetic. The ±64px slide-in has
     * room to travel inside a 1280px rail, but on a 390px phone it pushed the
     * document to 434px wide and gave the whole page a horizontal scrollbar.
     * Clipping here keeps the motion intact and the page free of sideways
     * scroll at every width. `clip` rather than `hidden` so the section does
     * not become a scroll container and break `position: sticky` ancestors.
     */
    <section ref={ref} className="overflow-x-clip bg-obsidian pb-[var(--spacing-128)]">
      <div className="page-rail">
        <div className="grid items-stretch gap-[var(--spacing-24)] lg:grid-cols-[290px_1fr]">
          {/*
            Tile — enters from the left. The shift is passed as a custom
            property rather than applied directly so `.statcard-slide` can zero
            it below `lg`, where a 390px column has no room to absorb 64px of
            travel and the card simply sat half off-screen.
          */}
          <div
            className="statcard-slide overflow-hidden rounded-[var(--radius-nested-cards)] bg-charcoal"
            style={{
              ["--slide" as string]: `${tileShift}px`,
              opacity: fade,
              transition: "opacity 0.4s linear",
            }}
          >
            <div className="flex h-full min-h-[330px] flex-col justify-center gap-[var(--spacing-16)] p-[var(--spacing-32)] font-mono text-[11px] leading-[1.9] text-white/70">
              <div className="text-white/40">by family, unshielded</div>
              {UNSHIELDED.families.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-[var(--spacing-16)]">
                  <span className="truncate">{f.label.split(" ")[0]}</span>
                  <span className={f.succeeded > 0 ? "text-warm-sandstone" : "text-white/35"}>
                    {f.succeeded}/{f.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Accent field — enters from the right. */}
          <div
            className="statcard-slide flex flex-col justify-center rounded-[var(--radius-feature-panels)] bg-forest-sovereignty p-[var(--spacing-40)] md:p-[56px]"
            style={{
              ["--slide" as string]: `${cardShift}px`,
              opacity: fade,
              transition: "opacity 0.4s linear",
            }}
          >
            <p className="max-w-[640px] text-[clamp(24px,3.6vw,40px)] leading-[1.25] tracking-[-0.4px] text-pure-white">
              {UNSHIELDED.injectionSusceptibility} of attacks flipped the unshielded
              agent&rsquo;s order. With the shield: {SHIELDED.injectionSusceptibility}.
            </p>
            <p className="mt-[var(--spacing-32)] font-mono text-[13px] text-white/55">
              arka attack --demo · {UNSHIELDED.vectorsRun} vectors · reproducible offline
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
