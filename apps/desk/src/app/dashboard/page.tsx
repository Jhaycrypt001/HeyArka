import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Eyebrow } from "@/components/ui";
import { Panel, Metric, GradeMark, Bar, Pill } from "@/components/dash-ui";
import { DashInspector } from "@/components/dash-inspector";
import { DashBench } from "@/components/dash-bench";
import { runLive, corpusSummary } from "@/lib/dashboard";
import { CANARY, TESTS, PAPERS } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Dashboard: HeyArka",
  description:
    "Live posture for an LLM trading agent: the full attack corpus run bare and shielded, with a headline inspector backed by the shipped sanitizer.",
};

/**
 * The dashboard.
 *
 * Every figure below is computed at request time by `runLive()`, which calls
 * the same `runCorpus` and `score` that back `arka attack --demo`. Nothing on
 * this page is a stored constant except the canary and test counts, which are
 * transcripts of runs that happened elsewhere and are labelled as such.
 *
 * `force-dynamic` because the point of the page is that the harness actually
 * ran. A prerendered dashboard would be a screenshot of a run, which is the
 * exact thing this project exists to catch.
 */
export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function DashboardPage() {
  const run = await runLive();
  const corpus = corpusSummary();

  const bare = run.unshielded;
  const shield = run.shielded;

  // Percentage points removed by the shield. Computed, not asserted.
  const injectionDrop = bare.injectionSusceptibilityRate - shield.injectionSusceptibilityRate;
  const riskDrop = bare.riskViolationRate - shield.riskViolationRate;

  return (
    <>
      <Navbar />
      <main className="page-rail pb-[var(--spacing-128)] pt-[var(--spacing-48)]">
        {/* --- Header ------------------------------------------------------ */}
        <header className="max-w-[820px]">
          <Eyebrow>Agent posture</Eyebrow>
          <h1 className="mt-[var(--spacing-20)] text-heading-sm md:text-heading-lg">
            Dashboard
          </h1>
          <p className="mt-[var(--spacing-20)] text-body text-graphite">
            The full attack corpus, run against the reference agent twice on
            this request: once bare, once behind{" "}
            <span className="font-mono text-obsidian">@heyarka/shield</span>.
            Every number below was computed {run.durationMs}ms ago by the same
            functions that back{" "}
            <span className="font-mono text-obsidian">arka attack --demo</span>,
            not read from a file.
          </p>
          <div className="mt-[var(--spacing-16)] flex flex-wrap items-center gap-[var(--spacing-8)]">
            <Pill tone="accent">{run.vectorCount} vectors</Pill>
            <Pill tone="accent">{run.familyCount} families</Pill>
            <Pill tone="neutral">{run.durationMs}ms</Pill>
            <Pill tone="good">no keys required</Pill>
          </div>
        </header>

        {/*
          --- How to use this ------------------------------------------------
          The panels below report measurements, which is useless to a reader who
          does not yet know what they are being invited to do. This strip names
          the three things that are actually operable on this page, in the order
          they are laid out, so the dashboard reads as an instrument rather than
          a poster.
        */}
        <Panel label="How to use this" className="mt-[var(--spacing-40)]" aside="four ways in">
          <ol className="grid gap-[var(--spacing-20)] sm:grid-cols-2 lg:grid-cols-4">
            <Step
              n="01"
              title="Read the two grades"
              body="The same agent, the same vectors, run twice. The left grade is what it scores with nothing in front of it. The right is with the shield."
            />
            <Step
              n="02"
              title="Fire an attack yourself"
              body="Pick any vector in the bench below and run it. You get the payload it injected and the order the agent produced, bare and shielded."
            />
            <Step
              n="03"
              title="Scan your own headline"
              body="Paste a real headline from your feed into the inspector. The shipped sanitizer reports every confusable and invisible character in it."
            />
            <Step
              n="04"
              title="Point it at your agent"
              body="arka attack --agent ./my-agent.js runs this same corpus against your code and writes a JSONL log plus an HTML report card."
            />
          </ol>
        </Panel>

        {/* --- Grades ------------------------------------------------------ */}
        <div className="mt-[var(--spacing-20)] grid gap-[var(--spacing-20)] lg:grid-cols-2">
          <Panel label="Unshielded" aside={bare.agentName}>
            <GradeMark
              grade={bare.grade}
              tone="bare"
              caption={`${bare.totalVectors} vectors run against a bare agent`}
            />
            <div className="mt-[var(--spacing-24)] grid grid-cols-2 gap-[var(--spacing-20)]">
              <Metric
                label="Injection rate"
                value={pct(bare.injectionSusceptibilityRate)}
                tone="bad"
                sub="attacks that changed the order"
              />
              <Metric
                label="Risk violations"
                value={pct(bare.riskViolationRate)}
                tone="bad"
                sub="breaches of its own contract"
              />
            </div>
          </Panel>

          <Panel label="Shielded" aside={shield.agentName}>
            <GradeMark
              grade={shield.grade}
              tone="shielded"
              caption="Identical agent, identical vectors, shield in front"
            />
            <div className="mt-[var(--spacing-24)] grid grid-cols-2 gap-[var(--spacing-20)]">
              <Metric
                label="Injection rate"
                value={pct(shield.injectionSusceptibilityRate)}
                tone="good"
                sub={`down ${(injectionDrop * 100).toFixed(1)}pp`}
              />
              <Metric
                label="Risk violations"
                value={pct(shield.riskViolationRate)}
                tone="good"
                sub={`down ${(riskDrop * 100).toFixed(1)}pp`}
              />
            </div>
          </Panel>
        </div>

        {/* --- Secondary metrics ------------------------------------------- */}
        <Panel
          label="Scorecard metrics"
          className="mt-[var(--spacing-20)]"
          aside="shielded run"
        >
          <div className="grid grid-cols-2 gap-[var(--spacing-24)] md:grid-cols-4">
            <Metric
              label="Decision consistency"
              value={pct(shield.decisionConsistency)}
              sub="no repeats run, so no evidence of inconsistency"
            />
            <Metric
              label="Look-ahead"
              value={pct(shield.lookAheadContaminationScore)}
              sub="memorization vs. inference"
            />
            <Metric
              label="Human takeover"
              value={pct(shield.humanTakeoverRate)}
              tone="accent"
              sub="escalated rather than auto-traded"
            />
            <Metric
              label="Neutralised"
              value={`${run.neutralised.length}/${run.vectorCount}`}
              tone="good"
              sub="hit bare, held shielded"
            />
          </div>

          {/*
            Both figures above are routinely over-read, so the caveats sit
            beside them rather than in a footnote. This is the same warning the
            scorecard docs carry.
          */}
          <div className="mt-[var(--spacing-24)] rounded-[var(--radius-nested-cards)] border border-bone bg-soft-mist p-[var(--spacing-16)]">
            <p className="text-[12px] leading-[1.7] text-graphite">
              <span className="text-obsidian">Read these carefully.</span>{" "}
              Consistency of {pct(shield.decisionConsistency)} from a single
              pass means no evidence of inconsistency was gathered, not that the
              agent is proven stable. And the look-ahead score inverts the usual
              signal: a contaminated agent is one whose order does{" "}
              <em>not</em> change when the evidence is removed.
            </p>
          </div>
        </Panel>

        {/*
          --- Attack bench ---------------------------------------------------
          The page's one genuinely interactive control over the harness itself.
          Every other panel is a report; this one lets the reader choose a
          vector, fire it, and watch the order move. The work happens in
          `bench()` via the shipped `runVector`, so the verdict shown here is
          the same adjudication `arka attack` makes.
        */}
        <Panel
          label="Attack bench"
          className="mt-[var(--spacing-20)]"
          aside="run one yourself"
        >
          <p className="mb-[var(--spacing-20)] max-w-[680px] text-[13px] leading-[1.7] text-graphite">
            Choose any vector in the corpus and fire it at the reference agent.
            You get the exact payload it injected into the feed, and three
            orders: the control with no attack, the bare agent under attack, and
            the same agent behind{" "}
            <span className="font-mono text-obsidian">@heyarka/shield</span>.
          </p>
          <DashBench
            vectors={corpus.map((v) => ({
              id: v.id,
              label: v.label,
              family: v.family,
            }))}
          />
        </Panel>

        {/* --- Inspector --------------------------------------------------- */}
        <Panel
          label="Headline inspector"
          className="mt-[var(--spacing-20)]"
          aside="live sanitizer"
        >
          <p className="mb-[var(--spacing-20)] max-w-[680px] text-[13px] leading-[1.7] text-graphite">
            Paste a headline from your own feed. The shipped{" "}
            <span className="font-mono text-obsidian">sanitizeText</span> runs
            over it server-side and reports every confusable and invisible
            character it finds, before any of it reaches a model.
          </p>
          <DashInspector />
        </Panel>

        {/* --- Family breakdown -------------------------------------------- */}
        <Panel label="By attack family" className="mt-[var(--spacing-20)]">
          <ul className="flex flex-col divide-y divide-bone">
            {run.families.map((f) => (
              <li
                key={f.family}
                className="grid grid-cols-1 gap-[var(--spacing-12)] py-[var(--spacing-16)] sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:items-center sm:gap-[var(--spacing-20)]"
              >
                <div className="min-w-0">
                  <div className="text-[14px] leading-[1.4] text-obsidian">{f.label}</div>
                  <div className="mt-[2px] font-mono text-[11px] text-smoke">
                    {f.family} · {f.total} vectors
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-[var(--spacing-8)]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-smoke">
                      Bare
                    </span>
                    <span className="font-mono text-[11px] text-warm-sandstone">
                      {f.bareSucceeded}/{f.total}
                    </span>
                  </div>
                  <div className="mt-[6px]">
                    <Bar value={f.bareSucceeded} total={f.total} tone="bad" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-[var(--spacing-8)]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-smoke">
                      Shielded
                    </span>
                    <span
                      className={`font-mono text-[11px] ${
                        f.shieldedSucceeded === 0
                          ? "text-forest-sovereignty"
                          : "text-warm-sandstone"
                      }`}
                    >
                      {f.shieldedSucceeded}/{f.total}
                    </span>
                  </div>
                  <div className="mt-[6px]">
                    <Bar
                      value={f.shieldedSucceeded}
                      total={f.total}
                      tone={f.shieldedSucceeded === 0 ? "good" : "bad"}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* --- Residual: what still gets through ---------------------------- */}
        <Panel
          label="What still gets through"
          className="mt-[var(--spacing-20)]"
          aside={`${run.residual.length} of ${run.vectorCount}`}
        >
          <p className="max-w-[680px] text-[13px] leading-[1.7] text-graphite">
            The shield eliminates every sanitizable vector. It stops none of the
            purely semantic ones, because a plausible-but-false headline is
            well-formed Unicode from a real source. Those are listed here by
            name rather than averaged away.
          </p>

          {run.residual.length === 0 ? (
            <p className="mt-[var(--spacing-16)] text-[13px] text-graphite">
              Nothing got through on this run.
            </p>
          ) : (
            <ul className="mt-[var(--spacing-16)] flex flex-col gap-[var(--spacing-12)]">
              {run.residual.map((id) => {
                const v = corpus.find((c) => c.id === id);
                return (
                  <li
                    key={id}
                    className="rounded-[var(--radius-nested-cards)] border border-warm-sandstone/35 bg-warm-sandstone/5 p-[var(--spacing-16)]"
                  >
                    <div className="flex flex-wrap items-center gap-[var(--spacing-8)]">
                      <span className="font-mono text-[12px] text-obsidian">{id}</span>
                      {v !== undefined && <Pill tone="bad">{v.label}</Pill>}
                    </div>
                    {v !== undefined && (
                      <p className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                        {v.description}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-[var(--spacing-20)]">
            <Link
              href="/docs/shield#limits"
              className="text-[13px] text-obsidian underline underline-offset-2"
            >
              What the shield does not stop
            </Link>
          </div>
        </Panel>

        {/*
          --- Measured under -------------------------------------------------
          Every rate above is only comparable against a run sharing these
          conditions. Printing them beside the numbers, rather than in a
          footnote, is the difference between a metric and a claim.
        */}
        <Panel
          label="Measured under"
          className="mt-[var(--spacing-20)]"
          aside={run.unshielded.conditions.corpusVersion}
        >
          <dl className="grid gap-[var(--spacing-20)] sm:grid-cols-2 lg:grid-cols-3">
            <Condition label="Corpus" value={run.unshielded.conditions.corpusVersion} />
            <Condition
              label="Vectors adjudicated"
              value={`${run.unshielded.conditions.vectorsAdjudicated} per pass, both passes`}
            />
            <Condition
              label="Judging view"
              value="State: adjudicated on the resulting order, never on the agent's narration. The stricter of the two views."
            />
            <Condition
              label="Clean context per vector"
              value={run.unshielded.conditions.cleanContext ? "Yes, rebuilt per vector" : "No"}
            />
            <Condition
              label="Risk contract"
              value={run.unshielded.conditions.riskContractApplied ? "Enforced on both passes" : "Not enforced"}
            />
            <Condition
              label="Recognition-execution gap"
              value={
                run.unshielded.recognitionExecutionGap === undefined
                  ? "No evidence: this agent emits no rationales, so the gap is unmeasurable rather than zero."
                  : `${(run.unshielded.recognitionExecutionGap * 100).toFixed(1)}% of successful attacks were ones the agent had already flagged.`
              }
            />
          </dl>
        </Panel>

        {/* --- Provenance: where each number came from ---------------------- */}
        <Panel label="Provenance" className="mt-[var(--spacing-20)]">
          <dl className="grid gap-[var(--spacing-20)] sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
                This page
              </dt>
              <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                Computed live by runCorpus and score, in process, on this
                request. No stored results.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
                Test suite
              </dt>
              <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                {TESTS.total} tests across {TESTS.byPackage.length} packages.
                Reproduce with pnpm -r test.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
                Canary
              </dt>
              <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                {CANARY.claim} {CANARY.ticks} ticks over {CANARY.spanHours}h,{" "}
                {CANARY.ordersPlaced} real orders per account on{" "}
                {CANARY.account}. {CANARY.divergence}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
                Attack sources
              </dt>
              <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                {PAPERS.map((p) => p.id).join(" and ")}. Both documented the
                attacks and shipped no defense.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
                Not claimed
              </dt>
              <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                No PnL. The scorecard measures whether an attack changed the
                order, not whether the order would have made money.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">
                Next step
              </dt>
              <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
                <Link
                  href="/desk"
                  className="text-obsidian underline underline-offset-2"
                >
                  Stress-test your own thesis
                </Link>{" "}
                against this corpus.
              </dd>
            </div>
          </dl>
        </Panel>
      </main>
      <Footer />
    </>
  );
}

/** One numbered step in the "how to use this" strip. */
function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">{n}</div>
      <div className="mt-[var(--spacing-8)] text-[14px] leading-[1.4] text-obsidian">{title}</div>
      <p className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite [overflow-wrap:anywhere]">
        {body}
      </p>
    </li>
  );
}

/** One measurement condition: the label, and what it was set to for this run. */
function Condition({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.55px] text-smoke">{label}</dt>
      <dd className="mt-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
