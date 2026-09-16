import { DocsHeader, DocsSection, CodeBlock, Callout, Code, DefList } from "@/components/docs-ui";
import { CORPUS, UNSHIELDED, SHIELDED } from "@/lib/facts";

export const metadata = { title: "CLI" };

/**
 * The `arka` reference.
 *
 * Commands, flags, and defaults below are transcribed from the binary's own
 * HELP text and its argument dispatch in packages/cli/src/bin.ts — including
 * the real default for --out. If a flag is listed here it exists; nothing is
 * aspirational.
 */
export default function CliPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="CLI"
        intro={
          <>
            <Code>arka</Code> has three commands: <Code>attack</Code> runs the
            corpus and appends to a JSONL log, <Code>score</Code> recomputes a
            scorecard from a log, and <Code>report</Code> renders one as a
            static HTML page. No API keys, no network, no configuration.
          </>
        }
      />

      <DocsSection title="Usage">
        <CodeBlock label="arka --help">{`arka attack --demo [--shielded] [--out <path>] [--report <path>]
arka attack --agent <path> [--shielded] [--out <path>] [--report <path>]
arka attack --repo <git-url> --entry <path> [--shielded] [--out <path>]
arka score <results.jsonl> [--agent-name <name>]
arka report <results.jsonl> --out <report.html> [--agent-name <name>]`}</CodeBlock>
      </DocsSection>

      <DocsSection id="attack" title="arka attack">
        <p>
          Runs all {CORPUS.vectorCount} vectors against an agent and appends one
          result per vector to the log. Pick exactly one agent source:
        </p>
        <DefList
          items={[
            {
              term: "--demo",
              def: "Uses the bundled zero-config reference agent. This is the path judges can run with nothing installed beyond the repo.",
            },
            {
              term: "--agent <path>",
              def: (
                <>
                  Loads a real agent module exporting an{" "}
                  <Code>AgentUnderTest</Code>, as a default export, a named{" "}
                  <Code>agent</Code> export, or a factory.
                </>
              ),
            },
            {
              term: "--repo <git-url> --entry <path>",
              def: (
                <>
                  Shallow-clones a public repo and loads <Code>--entry</Code>{" "}
                  relative to the clone root, the same way <Code>--agent</Code>{" "}
                  does.
                </>
              ),
            },
            {
              term: "--shielded",
              def: (
                <>
                  Wraps the agent in <Code>@heyarka/shield</Code> before
                  attacking it. Run the same agent twice, once with and once
                  without, for the A/B.
                </>
              ),
            },
            {
              term: "--out <path>",
              def: (
                <>
                  JSONL log path. Defaults to{" "}
                  <Code>reports/results.jsonl</Code>.
                </>
              ),
            },
            {
              term: "--report <path>",
              def: "Also render an HTML report card after the run.",
            },
          ]}
        />
        <Callout tone="warning" title="--repo executes code you did not write">
          It clones a repository and imports a module from it. Only point it at
          agents you own or have written permission to test. Disclose findings
          privately first and publish only aggregate or anonymized results
          unless the owner consents.
        </Callout>
      </DocsSection>

      <DocsSection title="The A/B in two commands">
        <CodeBlock label="Terminal">{`node packages/cli/dist/bin.js attack --demo
# grade ${UNSHIELDED.grade} · ${UNSHIELDED.injectionSusceptibility} of attacks changed the order

node packages/cli/dist/bin.js attack --demo --shielded
# grade ${SHIELDED.grade} · ${SHIELDED.injectionSusceptibility} of attacks changed the order`}</CodeBlock>
        <p>
          Both runs append to the same log by default. The shielded agent&rsquo;s
          name carries a <Code>+shield</Code> suffix, which is what keeps the two
          separable when the log is scored.
        </p>
      </DocsSection>

      <DocsSection id="score" title="arka score">
        <p>
          Recomputes a scorecard from an existing log and prints it. Pure
          aggregation. It never re-runs the agent, so scoring an old log is
          always reproducible.
        </p>
        <CodeBlock label="Terminal">{`arka score reports/results.jsonl --agent-name heyarka-demo-agent`}</CodeBlock>
        <p>
          <Code>--agent-name</Code> is required when a log holds more than one
          agent. Without it the command fails rather than averaging unrelated
          runs into one misleading number.
        </p>
      </DocsSection>

      <DocsSection id="report" title="arka report">
        <p>
          Renders a scorecard as a standalone HTML report card. The
          judge-facing artifact. Self-contained, with no external assets.
        </p>
        <CodeBlock label="Terminal">{`arka report reports/results.jsonl --out reports/card.html`}</CodeBlock>
      </DocsSection>
    </>
  );
}
