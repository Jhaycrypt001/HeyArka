import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { StartField } from "@/components/start-field";
import { DashInspector } from "@/components/dash-inspector";
import { ButtonFilled, ButtonOutlined, Eyebrow } from "@/components/ui";
import { runLive } from "@/lib/dashboard";

/**
 * The product entry page: a two-panel split in the reference's layout, but
 * with the right-hand panel carrying the live harness instead of a sign-in
 * form. There is deliberately no auth anywhere in HeyArka.
 *
 * That is a product decision, not a shortcut. HeyArka holds no accounts, no
 * funds and no user state; the CLI runs offline and the shield never sees a
 * credential. An account wall here would ask a judge to register before they
 * could watch a headline get sanitized, and would contradict the project's own
 * central claim that the LLM never touches credentials.
 *
 * `force-dynamic` because the left panel prints numbers from a real harness
 * run performed while rendering this request.
 */
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const run = await runLive();

  const bare = run.unshielded;
  const shielded = run.shielded;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <>
      <Navbar />
      <main>
        {/*
          The split is `lg:`-gated: below that the panels stack, live panel
          first, so a phone reader reaches the working tool without scrolling
          past a column of prose.
        */}
        <section className="relative isolate min-h-[calc(100svh-64px)] bg-obsidian">
          <StartField />

          <div className="relative z-10 mx-auto grid w-full max-w-[var(--page-max-width)] grid-cols-1 gap-[var(--spacing-40)] px-[var(--spacing-20)] py-[var(--spacing-56)] lg:grid-cols-2 lg:items-center lg:gap-[var(--spacing-64)] lg:py-[var(--spacing-96)]">
            {/* Left: what this is, and the measured result of running it. */}
            <div className="order-2 min-w-0 lg:order-1">
              <Eyebrow tone="light">No account required</Eyebrow>

              <h1 className="mt-[var(--spacing-24)] text-[clamp(34px,6.5vw,60px)] leading-[1.04] tracking-[-1.2px] text-pure-white">
                Break the agent
                <br />
                before the market does
              </h1>

              <p className="mt-[var(--spacing-24)] max-w-[52ch] text-body text-silhouette">
                HeyArka runs a corpus of {run.vectorCount} adversarial vectors against a trading
                agent, scores what got through, and then runs the identical corpus again with the
                shield in front of it. Both passes below were executed while this page rendered.
              </p>

              {/* Measured, not asserted: these come from the run above. */}
              <dl className="mt-[var(--spacing-32)] grid grid-cols-2 gap-[var(--spacing-20)] sm:grid-cols-4">
                <Stat label="Grade, bare" value={bare.grade} tone="bad" />
                <Stat label="Grade, shielded" value={shielded.grade} tone="good" />
                <Stat
                  label="Injection rate"
                  value={`${pct(bare.injectionSusceptibilityRate)} → ${pct(shielded.injectionSusceptibilityRate)}`}
                />
                <Stat
                  label="Risk violations"
                  value={`${pct(bare.riskViolationRate)} → ${pct(shielded.riskViolationRate)}`}
                />
              </dl>

              <div className="mt-[var(--spacing-32)] flex flex-wrap gap-[var(--spacing-12)]">
                <ButtonFilled href="/dashboard" tone="light">
                  Open the dashboard
                </ButtonFilled>
                <ButtonOutlined href="/docs/quickstart" tone="light">
                  Read the quickstart
                </ButtonOutlined>
              </div>

              <p className="mt-[var(--spacing-20)] font-mono text-micro-label uppercase leading-[1.8] tracking-[0.55px] text-smoke">
                Both passes computed in {run.durationMs}ms · {run.familyCount} attack families ·{" "}
                {run.neutralised.length} vectors neutralised, {run.residual.length} still get
                through
              </p>
            </div>

            {/* Right: the tool itself, where the sign-in panel would sit. */}
            <div className="order-1 min-w-0 lg:order-2">
              <div className="rounded-[var(--radius-feature-panels)] border border-white/12 bg-pure-white p-[var(--spacing-20)] sm:p-[var(--spacing-32)]">
                <Eyebrow>Try it on a real payload</Eyebrow>
                <h2 className="mt-[var(--spacing-16)] text-h4 leading-[1.2] tracking-[-0.4px] text-obsidian">
                  Paste a headline. See what is hiding in it.
                </h2>
                <p className="mt-[var(--spacing-12)] text-body-sm text-graphite">
                  This is the same sanitizer the shield runs before a headline reaches the model.
                  The samples are real attack strings from the corpus.
                </p>

                <div className="mt-[var(--spacing-24)]">
                  <DashInspector />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** A single measured figure in the left panel's strip. */
function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-forest-sovereignty"
      : tone === "bad"
        ? "text-warm-sandstone"
        : "text-pure-white";
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase leading-[1.4] tracking-[0.55px] text-smoke [overflow-wrap:anywhere]">
        {label}
      </dt>
      <dd
        className={`mt-[var(--spacing-8)] text-[clamp(18px,3.4vw,26px)] leading-[1.1] tracking-[-0.4px] [overflow-wrap:anywhere] ${color}`}
      >
        {value}
      </dd>
    </div>
  );
}
