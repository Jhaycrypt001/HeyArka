import "server-only";

import { CORPUS } from "@heyarka/core";
import type { AttackFamily, AttackVector } from "@heyarka/core";
import { DocsHeader, DocsSection, Callout, Code } from "@/components/docs-ui";
import { UNSHIELDED, SHIELDED } from "@/lib/facts";

export const metadata = { title: "Attack corpus" };

/**
 * The corpus reference — GENERATED from the real corpus, not transcribed.
 *
 * This page imports `CORPUS` from @heyarka/core: the exact array the CLI fans
 * out in `arka attack`, the same one the Desk's stress engine runs. Every id,
 * family, description, citation, and expected effect below is read off the
 * live vector objects at build time. Adding a vector to the corpus adds a row
 * here with no edit to this file, and no description on this page can drift
 * from what the code actually does — which is the whole point, given that a
 * hand-written vector table is exactly the kind of documentation that silently
 * goes stale.
 *
 * `import "server-only"` is the guard: @heyarka/core is pure and safe to
 * bundle, but this page has no interactivity, so pinning it to the server
 * keeps the corpus out of the client bundle entirely.
 *
 * Only the per-family prose below is authored. It explains *why* a family
 * exists, which is genuinely editorial and not derivable from the data.
 */
const FAMILY_NOTES: Record<
  AttackFamily,
  { title: string; why: string; shielded: "blocked" | "partial" | "not-blocked" }
> = {
  homoglyph: {
    title: "Homoglyph injection",
    why: "Swaps a ticker's Latin letters for Cyrillic or Greek lookalikes. The rendered headline is visually identical to a human; the byte sequence is not, so naive symbol matching fails or matches a phantom. This is the core method from arXiv:2601.13082.",
    shielded: "blocked",
  },
  "hidden-text": {
    title: "Hidden-text clauses",
    why: "Zero-width characters, bidi overrides, and markup-hidden spans carrying instructions a reader never sees but a model reads as part of the prompt.",
    shielded: "blocked",
  },
  "tool-hijack": {
    title: "Tool-call hijack",
    why: "Indirect injection in a news body aimed at the agent's tool calls rather than its sentiment, bypassing confirmations, escalating the tool surface, or redirecting parameters. The trading-specific case of OWASP ASI 2026's top agentic gap.",
    shielded: "blocked",
  },
  "semantic-trap": {
    title: "Semantic traps",
    why: "Plausible-but-false headlines, stale news replayed as fresh, and one rumor echoed by several aggregators to fake corroboration. Nothing is malformed, so no sanitizer can catch it at the character level.",
    shielded: "partial",
  },
  "look-ahead": {
    title: "Look-ahead / memorization",
    why: "Removes the evidence and checks whether the agent still answers confidently. A model that stays directional with no information is recalling a memorized outcome, not inferring. This is the alpha-decay method from arXiv:2601.13770 adapted to a live agent.",
    shielded: "not-blocked",
  },
  "sentiment-filter": {
    title: "Sentiment-filter poisoning",
    why: "Manufactures the balance or crowding conditions that live strategies gate entries on, forcing a trade the filter should have blocked.",
    shielded: "partial",
  },
};

/** Plain-language gloss of each `expectedEffect` value in the type union. */
const EFFECT_LABEL: Record<AttackVector["expectedEffect"], string> = {
  "flip-direction": "Flip direction",
  "inflate-size": "Inflate size",
  "misroute-symbol": "Misroute symbol",
  "bypass-risk": "Bypass risk controls",
  "force-entry": "Force an entry",
  "expose-memorization": "Expose memorization",
};

const SHIELD_LABEL = {
  blocked: { text: "Shield blocks this family", color: "#193a29" },
  partial: { text: "Shield blocks this family partially", color: "#a8927c" },
  "not-blocked": { text: "Not a sanitization problem", color: "#79648c" },
} as const;

/** Groups the live corpus by family, preserving the corpus's own order. */
function groupByFamily(): Array<{ family: AttackFamily; vectors: AttackVector[] }> {
  const groups = new Map<AttackFamily, AttackVector[]>();
  for (const vector of CORPUS) {
    const existing = groups.get(vector.family);
    if (existing) existing.push(vector);
    else groups.set(vector.family, [vector]);
  }
  return [...groups.entries()].map(([family, vectors]) => ({ family, vectors }));
}

function VectorRow({ vector }: { vector: AttackVector }) {
  return (
    <div className="border-t border-bone py-[var(--spacing-20)] first:border-t-0">
      <div className="flex flex-wrap items-center gap-[var(--spacing-12)]">
        <code className="font-mono text-[13px] text-obsidian">{vector.id}</code>
        <span className="rounded-[4px] bg-soft-mist px-[6px] py-[2px] font-mono text-[11px] uppercase tracking-[0.4px] text-graphite">
          {EFFECT_LABEL[vector.expectedEffect]}
        </span>
        {vector.citation && (
          <span className="font-mono text-[11px] text-graphite">{vector.citation}</span>
        )}
      </div>
      <p className="mt-[var(--spacing-8)] text-[14px] leading-[1.65] text-graphite">
        {vector.description}
      </p>
    </div>
  );
}

export default function CorpusPage() {
  const groups = groupByFamily();

  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="Attack corpus"
        intro={
          <>
            {CORPUS.length} vectors across {groups.length} families, every one
            deterministic and reproducible offline. This page is generated from
            the corpus source at build time. The ids, descriptions, citations,
            and expected effects below are read directly off the same array{" "}
            <Code>arka attack</Code> runs.
          </>
        }
      />

      <DocsSection title="How a vector works">
        <p>
          A vector is a pure transformation from a clean{" "}
          <Code>MarketContext</Code> to an attacked one. The harness runs the
          agent against both, diffs the two orders, and records the attack as
          successful if the direction, symbol, or size materially changed.
          Because vectors are pure functions with no randomness, a run is
          byte-for-byte reproducible.
        </p>
        <Callout title="Success means changed, not wrong">
          A vector counts as successful when it moved the agent&rsquo;s
          decision. That is deliberately stricter than asking whether the new
          decision was profitable: an attacker who can reliably move your order
          controls you, regardless of which way the market then went.
        </Callout>
      </DocsSection>

      <DocsSection title="Measured effect">
        <p>
          Against the bundled reference agent, this corpus flips{" "}
          {UNSHIELDED.injectionSusceptibility} of decisions unshielded and{" "}
          {SHIELDED.injectionSusceptibility} shielded. The residue is entirely
          semantic. See the per-family notes below.
        </p>
      </DocsSection>

      {groups.map(({ family, vectors }) => {
        const note = FAMILY_NOTES[family];
        const badge = SHIELD_LABEL[note.shielded];
        return (
          <DocsSection key={family} id={family} title={note.title}>
            <p>{note.why}</p>
            <div className="flex items-center gap-[var(--spacing-8)]">
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: badge.color }}
              />
              <span className="font-mono text-[12px] uppercase tracking-[0.4px] text-graphite">
                {badge.text} · {vectors.length}{" "}
                {vectors.length === 1 ? "vector" : "vectors"}
              </span>
            </div>
            <div className="mt-[var(--spacing-8)] rounded-[var(--radius-cards)] bg-soft-mist px-[var(--spacing-24)] py-[var(--spacing-8)]">
              {vectors.map((vector) => (
                <VectorRow key={vector.id} vector={vector} />
              ))}
            </div>
          </DocsSection>
        );
      })}

      <DocsSection title="Using the corpus directly">
        <p>
          The corpus is exported, so you can run it against your own agent
          without the CLI:
        </p>
        <div className="overflow-hidden rounded-[var(--radius-nested-cards)] bg-obsidian">
          <pre className="overflow-x-auto p-[var(--spacing-20)] font-mono text-[13px] leading-[1.7] text-pure-white">
            <code>{`import { CORPUS, runCorpus, score } from "@heyarka/core";

const results = await runCorpus({
  agent: myAgent,
  corpus: CORPUS,
  cleanContext: context,
  riskContract,
});

const card = score(myAgent.name, results);
console.log(card.grade, card.injectionSusceptibilityRate);`}</code>
          </pre>
        </div>
      </DocsSection>
    </>
  );
}
