import { DocsHeader, DocsSection, CodeBlock, Callout, Code, DefList } from "@/components/docs-ui";
import { CORPUS } from "@/lib/facts";

export const metadata = { title: "MCP server" };

/**
 * The MCP reference.
 *
 * The five tools below are the five actually registered in
 * packages/mcp/src/server.ts. The "what it cannot do" section reproduces the
 * real architectural limit recorded in tools.ts: there is no way to execute a
 * client's arbitrary agent code over the protocol, so the server exposes the
 * parts of the harness that operate on data rather than on a running agent.
 */
const TOOLS = [
  {
    name: "list_attack_vectors",
    what: `Lists every vector in the corpus with its id, description, expected effect, and citation. Takes no arguments.`,
  },
  {
    name: "apply_attack_vector",
    what: "Transforms a clean MarketContext into an attacked one using a named vector. Returns the attacked context so you can run your own agent on both and diff the orders.",
  },
  {
    name: "shield_context",
    what: "Runs the real sanitize → corroboration → point-in-time pipeline on a context and returns the cleaned result plus a full audit trail of what each layer changed.",
  },
  {
    name: "check_risk_contract",
    what: "Runs the deterministic, non-LLM veto check against a single proposed order, the same function the shield's final layer enforces.",
  },
  {
    name: "score_results",
    what: "Aggregates AttackResults you produced yourself into a full Scorecard with a letter grade. Does not run your agent for you.",
  },
];

export default function McpPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="MCP server"
        intro={
          <>
            <Code>@heyarka/mcp</Code> exposes the corpus, the shield pipeline,
            and the scorer as five MCP tools, so Claude, Cursor, or any other
            MCP client can red-team a trading agent conversationally. Every
            handler calls straight into <Code>@heyarka/core</Code> and{" "}
            <Code>@heyarka/shield</Code>, the same functions the CLI uses, not
            a reimplementation.
          </>
        }
      />

      <DocsSection title="Setup">
        <p>
          The server speaks stdio. Add it to your client&rsquo;s MCP
          configuration:
        </p>
        <CodeBlock label="claude_desktop_config.json">{`{
  "mcpServers": {
    "heyarka": {
      "command": "node",
      "args": ["packages/mcp/dist/bin.js"]
    }
  }
}`}</CodeBlock>
        <p>
          Run <Code>pnpm build</Code> first so <Code>dist/</Code> exists. The
          server needs no API keys and makes no network calls.
        </p>
      </DocsSection>

      <DocsSection id="tools" title="The five tools">
        <DefList items={TOOLS.map((t) => ({ term: t.name, def: t.what }))} />
      </DocsSection>

      <DocsSection title="What the server deliberately cannot do">
        <Callout title="It never runs your agent">
          There is no way to hand a live <Code>decide()</Code> function across
          the protocol, so the tools expose the parts of the harness that
          operate on <em>data</em>: applying vectors, shielding a context,
          checking a risk contract, and scoring results you produced. You run
          your agent; the server does the adversarial work around it.
        </Callout>
        <p>
          This is also why <Code>score_results</Code> takes results as input
          rather than producing them. The server never fabricates a scorecard.
          it only aggregates real results you supply.
        </p>
      </DocsSection>

      <DocsSection title="A typical loop">
        <p>Inside an MCP client, the working pattern is:</p>
        <CodeBlock label="Conversationally">{`1. list_attack_vectors
     → pick a vector id, e.g. "homoglyph-phantom-symbol"

2. apply_attack_vector { vectorId, context }
     → attacked context

3. run your own agent on the clean and attacked contexts

4. shield_context { context }
     → see what the agent would have been shown, hardened

5. score_results { agentName, results }
     → grade, injection susceptibility, per-family breakdown`}</CodeBlock>
        <p>
          All {CORPUS.vectorCount} vectors are available through step 2, and the
          scorer in step 5 is the same one behind <Code>arka score</Code>.
        </p>
      </DocsSection>
    </>
  );
}
