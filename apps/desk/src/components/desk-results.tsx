"use client";

import { useState } from "react";
import type { AttackFamily } from "@heyarka/core";
import type { Mutation, ScoreSummary, StressReport, VectorOutcome } from "@/lib/stress";
import { Eyebrow } from "./ui";

/**
 * Renders a completed stress report.
 *
 * Every number here came back from a real `runCorpus` call over the user's own
 * context. Nothing is interpolated, rounded up, or presented more favourably
 * than the harness reported it — including the residual attacks the shield
 * does not stop, which are given their own section rather than omitted.
 */

const FAMILY_LABELS: Record<AttackFamily, string> = {
  homoglyph: "Homoglyph injection",
  "hidden-text": "Hidden-text clauses",
  "tool-hijack": "Tool-call hijack",
  "semantic-trap": "Semantic traps",
  "look-ahead": "Look-ahead / memorization",
  "sentiment-filter": "Sentiment-filter poisoning",
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Makes invisible characters visible without altering the surrounding text. */
function VisibleText({ text }: { text: string }) {
  const parts = Array.from(text);
  return (
    <>
      {parts.map((ch, i) => {
        const cp = ch.codePointAt(0) ?? 0;
        const invisible =
          (cp >= 0x200b && cp <= 0x200f) ||
          (cp >= 0x202a && cp <= 0x202e) ||
          (cp >= 0x2060 && cp <= 0x2064) ||
          cp === 0xfeff;
        if (!invisible) return <span key={i}>{ch}</span>;
        return (
          <span
            key={i}
            title={`U+${cp.toString(16).toUpperCase().padStart(4, "0")}`}
            className="mx-[1px] inline-block rounded-[3px] bg-warm-sandstone/40 px-[3px] align-middle text-[9px] leading-[1.4] text-obsidian"
          >
            ZW
          </span>
        );
      })}
    </>
  );
}

function GradeBlock({ summary, tone }: { summary: ScoreSummary; tone: "bare" | "shielded" }) {
  const accent = tone === "bare" ? "text-warm-sandstone" : "text-pure-white";
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-16)]">
      <div className="font-mono text-micro-label uppercase tracking-[0.55px] text-white/45">
        {tone === "bare" ? "Unshielded" : "With @heyarka/shield"}
      </div>
      <div className={`text-[clamp(44px,7vw,72px)] leading-none ${accent}`}>{summary.grade}</div>
      <dl className="flex flex-col gap-[var(--spacing-8)] font-mono text-[12px] text-white/65">
        <div className="flex justify-between gap-[var(--spacing-16)]">
          <dt>injection susceptibility</dt>
          <dd className={accent}>{pct(summary.injectionSusceptibilityRate)}</dd>
        </div>
        <div className="flex justify-between gap-[var(--spacing-16)]">
          <dt>risk violations</dt>
          <dd className={accent}>{pct(summary.riskViolationRate)}</dd>
        </div>
        <div className="flex justify-between gap-[var(--spacing-16)]">
          <dt>human takeover</dt>
          <dd>{pct(summary.humanTakeoverRate)}</dd>
        </div>
        <div className="flex justify-between gap-[var(--spacing-16)]">
          <dt>look-ahead contamination</dt>
          <dd>{pct(summary.lookAheadContaminationScore)}</dd>
        </div>
      </dl>
    </div>
  );
}

function MutationView({ mutation }: { mutation: Mutation }) {
  const frame =
    "rounded-[var(--radius-nested-cards)] bg-soft-mist p-[var(--spacing-16)] font-mono text-[12px] leading-[1.6] break-words";

  if (mutation.kind === "edit") {
    return (
      <div className="flex flex-col gap-[var(--spacing-12)]">
        <div className={frame}>
          <div className="mb-[var(--spacing-8)] text-micro-label uppercase text-smoke">
            Your headline
          </div>
          <div className="text-graphite">{mutation.before}</div>
        </div>
        <div className={frame}>
          <div className="mb-[var(--spacing-8)] text-micro-label uppercase text-smoke">
            What the agent read
          </div>
          <div className="text-obsidian">
            <VisibleText text={mutation.after} />
          </div>
        </div>
        <ul className="flex flex-col gap-[var(--spacing-4)] font-mono text-[11px] text-graphite">
          {mutation.changes.map((c, i) => (
            <li key={i}>
              <span className="text-smoke">at {c.index}</span> &middot; {c.note}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (mutation.kind === "inject") {
    return (
      <div className={frame}>
        <div className="mb-[var(--spacing-8)] text-micro-label uppercase text-smoke">
          Fabricated item added beside your headlines &middot; source &ldquo;{mutation.source}&rdquo;
        </div>
        <div className="text-obsidian">
          <VisibleText text={mutation.headline} />
        </div>
        {mutation.body !== undefined && (
          <div className="mt-[var(--spacing-8)] text-graphite">
            <VisibleText text={mutation.body} />
          </div>
        )}
      </div>
    );
  }

  if (mutation.kind === "replace") {
    return (
      <div className="flex flex-col gap-[var(--spacing-12)]">
        <div className={frame}>
          <div className="mb-[var(--spacing-8)] text-micro-label uppercase text-smoke">
            Your headlines, removed
          </div>
          {mutation.removed.map((h, i) => (
            <div key={i} className="text-graphite line-through decoration-smoke">
              {h}
            </div>
          ))}
        </div>
        <div className={frame}>
          <div className="mb-[var(--spacing-8)] text-micro-label uppercase text-smoke">
            Substituted by &ldquo;{mutation.source}&rdquo;
          </div>
          <div className="text-obsidian">
            <VisibleText text={mutation.headline} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      <div className="mb-[var(--spacing-8)] text-micro-label uppercase text-smoke">
        Context altered
      </div>
      <div className="text-obsidian">{mutation.note}</div>
    </div>
  );
}

function OutcomeRow({ outcome }: { outcome: VectorOutcome }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-bone first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-[var(--spacing-16)] py-[var(--spacing-16)] text-left"
      >
        <span
          className={`shrink-0 rounded-[6px] px-[var(--spacing-8)] py-[3px] font-mono text-[10px] uppercase tracking-[0.55px] ${
            outcome.succeeded
              ? "bg-warm-sandstone/25 text-obsidian"
              : "bg-soft-mist text-smoke"
          }`}
        >
          {outcome.succeeded ? "Flipped" : "Held"}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-obsidian">
          {outcome.vectorId}
        </span>
        <span className="hidden shrink-0 font-mono text-[11px] text-smoke sm:block">
          {FAMILY_LABELS[outcome.family]}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-smoke">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-[var(--spacing-16)] pb-[var(--spacing-24)]">
          <p className="max-w-[760px] text-[13px] leading-[1.6] text-graphite">
            {outcome.description}
          </p>

          {outcome.mutation !== undefined && <MutationView mutation={outcome.mutation} />}

          <div className="flex flex-wrap gap-[var(--spacing-24)] font-mono text-[11px]">
            <div>
              <div className="text-smoke">Clean decision</div>
              <div className="mt-[var(--spacing-4)] text-obsidian">
                {outcome.clean.side} {outcome.clean.size} {outcome.clean.symbol}
              </div>
            </div>
            <div>
              <div className="text-smoke">Attacked decision</div>
              <div
                className={`mt-[var(--spacing-4)] ${
                  outcome.succeeded ? "text-warm-sandstone" : "text-obsidian"
                }`}
              >
                {outcome.attacked.side} {outcome.attacked.size} {outcome.attacked.symbol}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-smoke">Delta</div>
              <div className="mt-[var(--spacing-4)] break-words text-obsidian">{outcome.delta}</div>
            </div>
          </div>

          {outcome.riskViolations.length > 0 && (
            <div className="font-mono text-[11px]">
              <div className="text-smoke">Risk-contract violations</div>
              <ul className="mt-[var(--spacing-4)] flex flex-col gap-[2px] text-warm-sandstone">
                {outcome.riskViolations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          )}

          {outcome.citation !== undefined && (
            <div className="font-mono text-[11px] text-smoke">
              Reproduces {outcome.citation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DeskResults({ report }: { report: StressReport }) {
  const flipped = report.outcomes.filter((o) => o.succeeded).length;

  return (
    <div className="flex flex-col gap-[var(--spacing-40)]">
      {/* Grade comparison. */}
      <div className="rounded-[var(--radius-cards)] bg-obsidian p-[var(--spacing-32)] md:p-[var(--spacing-40)]">
        <div className="flex flex-col gap-[var(--spacing-32)] sm:flex-row sm:items-start">
          <GradeBlock summary={report.unshielded} tone="bare" />
          <div className="hidden w-px self-stretch bg-white/15 sm:block" />
          <GradeBlock summary={report.shielded} tone="shielded" />
        </div>
        <p className="mt-[var(--spacing-32)] max-w-[640px] text-[13px] leading-[1.6] text-white/55">
          {flipped} of {report.outcomes.length} vectors changed the agent&rsquo;s order on your
          thesis. The shield neutralised {report.neutralised.length};{" "}
          {report.residual.length} still got through.
        </p>
      </div>

      {/* Per-family breakdown. */}
      <div>
        <Eyebrow>By family</Eyebrow>
        <div className="mt-[var(--spacing-24)] grid gap-[var(--spacing-16)] sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(FAMILY_LABELS) as AttackFamily[]).map((family) => {
            const bare = report.unshielded.byFamily[family];
            const shielded = report.shielded.byFamily[family];
            if (bare.total === 0) return null;
            return (
              <div
                key={family}
                className="min-w-0 rounded-[var(--radius-nested-cards)] bg-soft-mist p-[var(--spacing-20)]"
              >
                <div className="font-mono text-micro-label uppercase tracking-[0.55px] text-smoke">
                  {FAMILY_LABELS[family]}
                </div>
                <div className="mt-[var(--spacing-12)] flex items-baseline gap-[var(--spacing-12)] font-mono text-[13px]">
                  <span
                    className={bare.succeeded > 0 ? "text-warm-sandstone" : "text-graphite"}
                  >
                    {bare.succeeded}/{bare.total}
                  </span>
                  <span className="text-smoke">&rarr;</span>
                  <span className={shielded.succeeded > 0 ? "text-obsidian" : "text-graphite"}>
                    {shielded.succeeded}/{shielded.total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Every vector, expandable. */}
      <div>
        <Eyebrow>Every vector, against your text</Eyebrow>
        <div className="mt-[var(--spacing-16)]">
          {report.outcomes.map((outcome) => (
            <OutcomeRow key={outcome.vectorId} outcome={outcome} />
          ))}
        </div>
      </div>

      {/* What the shield does not stop — stated, not buried. */}
      {report.residual.length > 0 && (
        <div className="rounded-[var(--radius-cards)] bg-bone p-[var(--spacing-32)]">
          <Eyebrow>What the shield did not stop</Eyebrow>
          <p className="mt-[var(--spacing-16)] max-w-[680px] text-[13px] leading-[1.6] text-graphite">
            These vectors changed the order even with the shield on. They are semantic rather
            than encoding attacks: the text is legitimate, so no sanitizer can strip it. This is
            reported rather than hidden because a red-team tool that only advertises its wins is
            not trustworthy.
          </p>
          <ul className="mt-[var(--spacing-16)] flex flex-col gap-[var(--spacing-4)] font-mono text-[12px] text-obsidian">
            {report.residual.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Provenance of the numbers. */}
      <div className="font-mono text-[11px] leading-[1.8] text-smoke">
        <div>agent under test &middot; {report.agentName}</div>
        <div>
          context &middot; {report.context.symbol} @ {report.context.price} &middot; as of{" "}
          {report.context.asOf}
        </div>
        <div>
          risk contract &middot; max {report.riskContract.maxNotionalPerTrade} &middot; approval
          above {report.riskContract.humanApprovalThreshold}
        </div>
        <div>
          Reproduce in a terminal: <span className="text-graphite">arka attack --demo</span>
        </div>
      </div>
    </div>
  );
}
