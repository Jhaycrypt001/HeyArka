import Link from "next/link";
import { DocsHeader, DocsSection, CodeBlock, Callout, Code } from "@/components/docs-ui";
import { CORPUS, TESTS, UNSHIELDED, SHIELDED, CANARY } from "@/lib/facts";

export const metadata = { title: "Quickstart" };

/**
 * The proof path. These are the commands judges will actually run, so they
 * are the real ones and the quoted output matches a genuine run — the same
 * figures the landing page quotes, both read from lib/facts.ts.
 */
export default function QuickstartPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Start"
        title="Quickstart"
        intro={
          <>
            Three commands to a graded report card. No API keys, no network, no
            configuration. Everything below runs offline on any machine with
            Node 20.
          </>
        }
      />

      <DocsSection title="1. Install and build">
        <CodeBlock label="Terminal">{`pnpm install && pnpm build`}</CodeBlock>
        <p>Nothing phones home. There is no telemetry and no account.</p>
      </DocsSection>

      <DocsSection title="2. Attack the bundled agent">
        <CodeBlock label="Terminal">{`pnpm attack`}</CodeBlock>
        <p>
          Runs all {CORPUS.vectorCount} vectors against the bundled reference
          agent, a deliberately naive keyword-sentiment agent with no
          provenance checking, which is the class of agent the published attacks
          target. Result: grade {UNSHIELDED.grade},{" "}
          {UNSHIELDED.injectionSusceptibility} of attacks changed the order,{" "}
          {UNSHIELDED.riskViolation} breached its own risk contract.
        </p>
      </DocsSection>

      <DocsSection title="3. Attack it again, behind the shield">
        <CodeBlock label="Terminal">{`node packages/cli/dist/bin.js attack --demo --shielded`}</CodeBlock>
        <p>
          The same agent, same vectors, wrapped in{" "}
          <Code>@heyarka/shield</Code>: grade {SHIELDED.grade},{" "}
          {SHIELDED.injectionSusceptibility} changed,{" "}
          {SHIELDED.riskViolation} risk violations. The remaining{" "}
          {SHIELDED.injectionSusceptibility} is entirely semantic.{" "}
          <Link
            href="/docs/shield#limits"
            className="text-obsidian underline underline-offset-2"
          >
            What the shield does not stop
          </Link>{" "}
          spells out why.
        </p>
      </DocsSection>

      <DocsSection title="Run the test suite">
        <CodeBlock label="Terminal">{`pnpm -r test`}</CodeBlock>
        <p>
          {TESTS.total} tests across {TESTS.byPackage.length} packages:{" "}
          {TESTS.byPackage
            .map((p) => `${p.name.replace("@heyarka/", "")} ${p.count}`)
            .join(", ")}
          .
        </p>
      </DocsSection>

      <DocsSection title="Attack your own agent">
        <p>
          Anything that can be expressed as an <Code>AgentUnderTest</Code> can
          be attacked. That interface is one method:
        </p>
        <CodeBlock label="TypeScript">{`export default {
  name: "my-agent",
  async decide(ctx) {
    // ctx.news is the untrusted channel.
    return { side: "hold", symbol: ctx.symbol, size: 0 };
  },
};`}</CodeBlock>
        <CodeBlock label="Terminal">{`arka attack --agent ./my-agent.js
arka attack --agent ./my-agent.js --shielded`}</CodeBlock>
      </DocsSection>

      <DocsSection title="The live canary">
        <p>
          <Code>@heyarka/canary</Code> runs the A/B continuously against a real
          public news feed, across two Bitget Demo paper accounts, one shielded and
          one not, ticking {CANARY.cadence}.
        </p>
        <Callout tone="warning" title="Demo trading only, enforced in code">
          The client sends the Bitget paper-trading header unconditionally.
          There is no live mode. Not a flag, not a config option. Credentials
          come from environment variables only and are never logged.
        </Callout>
        <Callout title="What the canary currently shows">
          {CANARY.divergence}
        </Callout>
      </DocsSection>
    </>
  );
}
