import Link from "next/link";
import { DocsHeader, DocsSection, Callout, Code, DefList } from "@/components/docs-ui";
import { CORPUS, TESTS, UNSHIELDED, SHIELDED, PAPERS } from "@/lib/facts";

export const metadata = { title: "Overview" };

/**
 * The docs entry point. Every number on this page reads from lib/facts.ts,
 * which records only figures produced by actually running the tool — so this
 * page cannot drift from the CLI's real output without the landing page
 * drifting too.
 */
const PACKAGES = [
  {
    name: "@heyarka/core",
    what: "The attack corpus, the runner that fans it out against an agent, and the scoring math. No I/O, no network, just pure functions, which is why the same code runs in the CLI and in the browser-facing Desk.",
  },
  {
    name: "@heyarka/shield",
    what: "The hardening layer: sanitizer, corroboration gate, point-in-time guard, and a deterministic risk contract. Wraps any agent and returns one with the same shape.",
  },
  {
    name: "@heyarka/cli",
    what: "The arka binary: attack, score, and report. Runs the whole corpus offline with no API keys.",
  },
  {
    name: "@heyarka/mcp",
    what: "An MCP server exposing the corpus, the shield pipeline, and the scorer as tools for Claude, Cursor, and any other MCP client.",
  },
  {
    name: "@heyarka/canary",
    what: "The live A/B: two Bitget Demo paper accounts, one shielded and one not, trading the same real news feed.",
  },
];

export default function DocsOverviewPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Documentation"
        title="HeyArka"
        intro={
          <>
            An adversarial evaluation harness for LLM trading agents. It runs a
            corpus of {CORPUS.vectorCount} published attacks against an agent,
            scores what changed, and ships a shield that blocks most of them.
            Everything here runs offline with no API keys.
          </>
        }
      />

      <DocsSection title="What problem this solves">
        <p>
          A trading agent that reads the news has an untrusted input channel.
          The literature has already shown what that costs:{" "}
          <Code>{PAPERS[0].id}</Code> documented that Unicode homoglyph
          substitution and hidden-text clauses in headlines are imperceptible to
          a human reader but reliably flip LLM sentiment, and proposed no
          defense. <Code>{PAPERS[1].id}</Code> showed that standard LLMs appear
          profitable in backtests partly by recalling memorized outcomes rather
          than predicting.
        </p>
        <p>
          HeyArka is the missing half: it reproduces those attacks against a
          specific agent, quantifies the damage, and provides the layer that
          stops them.
        </p>
      </DocsSection>

      <DocsSection title="The measured result">
        <p>
          Against the bundled reference agent, the full corpus produces this.
          reproducible on any machine with Node 20 by running{" "}
          <Code>pnpm attack</Code>:
        </p>
        <DefList
          items={[
            {
              term: "Unshielded",
              def: (
                <>
                  Grade {UNSHIELDED.grade} ·{" "}
                  {UNSHIELDED.injectionSusceptibility} of attacks changed the
                  order · {UNSHIELDED.riskViolation} breached the agent&rsquo;s
                  own risk contract.
                </>
              ),
            },
            {
              term: "Shielded",
              def: (
                <>
                  Grade {SHIELDED.grade} ·{" "}
                  {SHIELDED.injectionSusceptibility} of attacks changed the
                  order · {SHIELDED.riskViolation} risk violations.
                </>
              ),
            },
          ]}
        />
        <p>
          The shield does not reach zero, and the docs do not claim it does. It
          eliminates every sanitizable vector (homoglyphs, hidden text, tool
          hijacking) and stops none of the semantic traps, because a
          well-formed lie is indistinguishable from a well-formed fact at the
          character level. <Link href="/docs/shield" className="text-obsidian underline underline-offset-2">
            What the shield does and does not stop
          </Link>{" "}
          is written out honestly.
        </p>
      </DocsSection>

      <DocsSection title="The packages">
        <DefList
          items={PACKAGES.map((p) => ({ term: p.name, def: p.what }))}
        />
        <p className="font-mono text-[13px] text-graphite">
          {TESTS.total} tests across {TESTS.byPackage.length} packages.
        </p>
      </DocsSection>

      <DocsSection title="Rules this project enforces in code">
        <Callout tone="warning" title="Demo trading only">
          The canary sends the Bitget paper-trading header unconditionally.
          There is deliberately no live mode. Not a flag, not a config option.
          A canary that could accidentally target live funds is not something
          this project ships.
        </Callout>
        <Callout title="Credentials never enter the log">
          API keys are read from environment variables only. They are never
          logged, never written to the JSONL audit trail, and never printed.
        </Callout>
        <Callout title="Consent before you point this at anyone">
          <Code>arka attack --repo</Code> clones and executes code from a git
          URL. Only use it on agents you own or have written permission to
          test. Disclose privately first; publish aggregate results only.
        </Callout>
      </DocsSection>

      <DocsSection title="Where to go next">
        <DefList
          items={[
            {
              term: "/docs/quickstart",
              def: "Three commands to a graded report card, offline.",
            },
            {
              term: "/docs/corpus",
              def: `All ${CORPUS.vectorCount} attack vectors, generated from the corpus source itself.`,
            },
            {
              term: "/docs/shield",
              def: "The four hardening layers, and what each one cannot do.",
            },
            {
              term: "/docs/scorecard",
              def: "How each of the six metrics is computed and graded.",
            },
            { term: "/docs/cli", def: "Every arka command and flag." },
            { term: "/docs/mcp", def: "The five MCP tools and how to wire them up." },
          ]}
        />
      </DocsSection>
    </>
  );
}
