"use client";

import { useState } from "react";
import { Pill } from "./dash-ui";

/**
 * The attack bench: the dashboard's hands-on half.
 *
 * Every other panel reports a run that already happened. This one lets the
 * reader choose an attack, fire it, and watch the reference agent's order move
 * — bare, then behind the shield, against the same clean context. The work is
 * done by the shipped `runVector` on the server; this component only chooses
 * the vector and renders what came back.
 *
 * Response shapes mirror `BenchResult` in lib/dashboard.ts, redeclared here
 * because that module is `server-only` and importing it from a client component
 * would pull the harness into the browser bundle.
 */

interface ProposedOrder {
  side: "buy" | "sell" | "hold";
  symbol: string;
  size: number;
  confidence?: number;
  rationale?: string;
  requiresHumanApproval?: boolean;
}

interface BenchHeadline {
  id: string;
  clean: string;
  attacked: string;
  changed: boolean;
}

interface BenchPass {
  order: ProposedOrder;
  succeeded: boolean;
  delta: string;
  riskViolations: string[];
}

interface BenchResult {
  vectorId: string;
  family: string;
  familyLabel: string;
  description: string;
  citation?: string;
  expectedEffect: string;
  baseline: ProposedOrder;
  headlines: BenchHeadline[];
  injected: string[];
  bare: BenchPass;
  shielded: BenchPass;
  durationMs: number;
}

export interface BenchVectorOption {
  id: string;
  label: string;
  family: string;
}

export function DashBench({ vectors }: { vectors: BenchVectorOption[] }) {
  const [selected, setSelected] = useState(vectors[0]?.id ?? "");
  const [result, setResult] = useState<BenchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fire(vectorId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/dashboard/api/bench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Bench run failed.");
        setResult(null);
        return;
      }
      setResult(data as BenchResult);
    } catch {
      setError("Could not reach the bench.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-20)]">
      {/*
        A native select rather than a chip rail: sixteen vectors would wrap to
        four lines of chips on a phone, and the grouping by family is what makes
        the list navigable.
      */}
      <div className="flex flex-col gap-[var(--spacing-12)] sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="bench-vector"
            className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke"
          >
            Pick an attack vector
          </label>
          <select
            id="bench-vector"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="mt-[var(--spacing-8)] w-full rounded-[var(--radius-nested-cards)] border border-bone bg-soft-mist px-[var(--spacing-12)] py-[var(--spacing-12)] font-mono text-[13px] text-obsidian outline-none transition-colors duration-200 focus:border-graphite"
          >
            {vectors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id} · {v.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy || selected === ""}
          onClick={() => void fire(selected)}
          className="shrink-0 rounded-[var(--radius-buttons)] bg-obsidian px-[var(--spacing-20)] py-[var(--spacing-12)] text-body-sm text-pure-white transition-colors duration-200 hover:bg-charcoal disabled:opacity-40"
        >
          {busy ? "Running..." : "Run this attack"}
        </button>
      </div>

      {error !== null && (
        <p className="rounded-[var(--radius-nested-cards)] border border-warm-sandstone/40 bg-warm-sandstone/5 px-[var(--spacing-16)] py-[var(--spacing-12)] text-[13px] text-graphite">
          {error}
        </p>
      )}

      {result !== null && <BenchReport result={result} />}
    </div>
  );
}

function BenchReport({ result }: { result: BenchResult }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-20)] border-t border-bone pt-[var(--spacing-20)]">
      <div>
        <div className="flex flex-wrap items-center gap-[var(--spacing-8)]">
          <Pill tone="neutral">{result.familyLabel}</Pill>
          <Pill tone={result.bare.succeeded ? "bad" : "good"}>
            bare: {result.bare.succeeded ? "hijacked" : "held"}
          </Pill>
          <Pill tone={result.shielded.succeeded ? "bad" : "good"}>
            shielded: {result.shielded.succeeded ? "hijacked" : "held"}
          </Pill>
          <Pill tone="neutral">{result.durationMs}ms</Pill>
        </div>
        <p className="mt-[var(--spacing-12)] max-w-[680px] text-[13px] leading-[1.7] text-graphite">
          {result.description}
        </p>
        {result.citation !== undefined && (
          <p className="mt-[var(--spacing-8)] font-mono text-[11px] text-smoke">
            {result.citation}
          </p>
        )}
      </div>

      {/* --- The payload ------------------------------------------------- */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
          What the vector did to the feed
        </div>

        {result.headlines.filter((h) => h.changed).length === 0 &&
        result.injected.length === 0 ? (
          <p className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
            This vector left the headlines untouched. It attacks a different part
            of the context, such as the timestamps or the source list.
          </p>
        ) : (
          <div className="mt-[var(--spacing-12)] flex flex-col gap-[var(--spacing-12)]">
            {result.headlines
              .filter((h) => h.changed)
              .map((h) => (
                <div key={h.id} className="grid gap-[var(--spacing-8)] sm:grid-cols-2">
                  <Line label="Original" text={h.clean} />
                  <Line label="After the vector" text={h.attacked} reveal />
                </div>
              ))}
            {result.injected.map((text, i) => (
              <Line key={`inj-${i}`} label="Injected item" text={text} reveal />
            ))}
          </div>
        )}
      </div>

      {/* --- The three orders -------------------------------------------- */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
          What the agent decided
        </div>
        <div className="mt-[var(--spacing-12)] grid gap-[var(--spacing-12)] md:grid-cols-3">
          <OrderCard
            label="Control"
            note="no attack applied"
            order={result.baseline}
            tone="neutral"
          />
          <OrderCard
            label="Bare"
            note={result.bare.delta}
            order={result.bare.order}
            tone={result.bare.succeeded ? "bad" : "good"}
            violations={result.bare.riskViolations}
          />
          <OrderCard
            label="Shielded"
            note={result.shielded.delta}
            order={result.shielded.order}
            tone={result.shielded.succeeded ? "bad" : "good"}
            violations={result.shielded.riskViolations}
          />
        </div>
      </div>

      {/*
        The verdict is spelled out rather than left to the reader to infer from
        three cards, and it stays honest when the shield did not help: a vector
        that gets through shielded says so in the same place a win would.
      */}
      <div
        className={`rounded-[var(--radius-nested-cards)] border p-[var(--spacing-16)] ${
          result.bare.succeeded && !result.shielded.succeeded
            ? "border-forest-sovereignty/30 bg-forest-sovereignty/5"
            : result.shielded.succeeded
              ? "border-warm-sandstone/40 bg-warm-sandstone/5"
              : "border-bone bg-soft-mist"
        }`}
      >
        <p className="text-[13px] leading-[1.7] text-graphite">
          <span className="text-obsidian">Verdict.</span>{" "}
          {result.bare.succeeded && !result.shielded.succeeded
            ? "The bare agent changed its order under this attack. Behind the shield, the same agent and the same payload produced no material change. This vector is neutralised."
            : result.shielded.succeeded
              ? "This attack got through the shield. It is semantic, not encoding-based: the headline is well-formed Unicode from a plausible source, so there is nothing for the sanitizer to strip. HeyArka reports it rather than averaging it away."
              : "The bare agent held against this vector on its own, so the shield had nothing to neutralise here. Not every vector lands on every agent, which is why the corpus reports per-vector outcomes rather than one number."}
        </p>
      </div>

      {/*
        The CLI runs the whole corpus rather than one vector, so these commands
        are the real ones and the reader is told where to find this row in the
        output. Printing an invented `--vector` flag would be a lie the first
        person to paste it would catch.
      */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
          Reproduce this outside the browser
        </div>
        <pre className="mt-[var(--spacing-8)] overflow-x-auto rounded-[var(--radius-nested-cards)] border border-bone bg-soft-mist px-[var(--spacing-12)] py-[var(--spacing-12)] font-mono text-[12px] leading-[1.8] text-obsidian">
          <code>{`arka attack --demo --out results.jsonl
arka attack --demo --shielded --out shielded.jsonl
grep ${result.vectorId} results.jsonl shielded.jsonl`}</code>
        </pre>
        <p className="mt-[var(--spacing-8)] text-[12px] leading-[1.6] text-graphite">
          The CLI runs the full corpus in one pass. The grep pulls this vector&rsquo;s
          two rows out of the logs, which carry the same verdict you see above.
        </p>
      </div>
    </div>
  );
}

/**
 * A headline line. With `reveal`, invisible formatting characters are drawn as
 * badges, because an attacked headline that renders identically to the clean
 * one is exactly the failure this project exists to surface.
 */
function Line({ label, text, reveal = false }: { label: string; text: string; reveal?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">{label}</div>
      <div className="mt-[var(--spacing-8)] rounded-[var(--radius-nested-cards)] border border-bone bg-soft-mist px-[var(--spacing-12)] py-[var(--spacing-12)]">
        <code className="block whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.7] text-obsidian">
          {reveal ? <Revealed text={text} /> : text}
        </code>
      </div>
    </div>
  );
}

/** Codepoints with no glyph, rendered as their U+ badge so they can be seen. */
const INVISIBLE = new Set([
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0xfeff,
]);

function Revealed({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) => {
        const cp = ch.codePointAt(0) ?? 0;
        if (INVISIBLE.has(cp) || (cp >= 0x2061 && cp <= 0x2064)) {
          const hex = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
          return (
            <span
              key={i}
              title={`${hex} carries no glyph`}
              className="mx-[1px] rounded-[3px] bg-slate-blue/25 px-[3px] align-middle text-[9px] text-slate-blue"
            >
              {hex}
            </span>
          );
        }
        // Anything outside Basic Latin in a ticker headline is worth marking:
        // this is where a Cyrillic lookalike hides.
        if (cp > 0x7f) {
          return (
            <span
              key={i}
              title={`U+${cp.toString(16).toUpperCase().padStart(4, "0")} is not ASCII`}
              className="rounded-[2px] bg-warm-sandstone/30 px-[1px] underline decoration-warm-sandstone decoration-wavy underline-offset-2"
            >
              {ch}
            </span>
          );
        }
        return <span key={i}>{ch}</span>;
      })}
    </>
  );
}

function OrderCard({
  label,
  note,
  order,
  tone,
  violations = [],
}: {
  label: string;
  note: string;
  order: ProposedOrder;
  tone: "neutral" | "good" | "bad";
  violations?: string[];
}) {
  const color =
    tone === "good"
      ? "text-forest-sovereignty"
      : tone === "bad"
        ? "text-warm-sandstone"
        : "text-obsidian";
  const border =
    tone === "good"
      ? "border-forest-sovereignty/30"
      : tone === "bad"
        ? "border-warm-sandstone/40"
        : "border-bone";

  return (
    <div className={`min-w-0 rounded-[var(--radius-nested-cards)] border p-[var(--spacing-16)] ${border}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">{label}</div>
      <div className={`mt-[var(--spacing-8)] text-[clamp(18px,4vw,24px)] leading-[1.1] tracking-[-0.4px] [overflow-wrap:anywhere] ${color}`}>
        {order.side.toUpperCase()} {order.size}
      </div>
      <div className="mt-[var(--spacing-4)] font-mono text-[11px] text-smoke [overflow-wrap:anywhere]">
        {order.symbol}
        {order.confidence !== undefined && ` · conf ${order.confidence}`}
        {order.requiresHumanApproval === true && " · needs human"}
      </div>
      <div className="mt-[var(--spacing-8)] text-[12px] leading-[1.5] text-graphite [overflow-wrap:anywhere]">
        {note}
      </div>
      {violations.length > 0 && (
        <ul className="mt-[var(--spacing-8)] flex flex-col gap-[2px]">
          {violations.map((v) => (
            <li key={v} className="text-[11px] leading-[1.5] text-warm-sandstone [overflow-wrap:anywhere]">
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
