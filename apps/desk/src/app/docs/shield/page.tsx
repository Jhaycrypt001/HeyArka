import { DocsHeader, DocsSection, CodeBlock, Callout, Code, DefList } from "@/components/docs-ui";
import { UNSHIELDED, SHIELDED } from "@/lib/facts";

export const metadata = { title: "Shield" };

/**
 * The shield reference.
 *
 * The section on what the shield does NOT stop is not a disclaimer bolted on
 * at the end — it is the most important part of this page. The sanitizer's own
 * source header makes the same point (decoding a hidden payload makes it
 * legible, not false), and a docs site that quietly omitted that while the
 * code documented it would be misrepresenting the product.
 */
export default function ShieldPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="Shield"
        intro={
          <>
            <Code>@heyarka/shield</Code> wraps any agent and returns one with an
            identical shape, so it drops in wherever the bare agent was used.
            Four layers run in order: sanitize, corroboration gate,
            point-in-time guard, then a deterministic risk contract applied to
            the order the model produced.
          </>
        }
      />

      <DocsSection title="Wrapping an agent">
        <p>
          <Code>shieldAgent</Code> takes an <Code>AgentUnderTest</Code> and
          returns an <Code>AgentUnderTest</Code>. That is the whole integration
          surface. There is no framework to adopt.
        </p>
        <CodeBlock label="TypeScript">{`import { shieldAgent } from "@heyarka/shield";

const hardened = shieldAgent(myAgent, {
  riskContract: {
    maxNotionalPerTrade: 5_000,
    allowedSymbols: ["BTCUSDT"],
    humanApprovalThreshold: 2_500,
  },
  onAudit: (event) => auditLog.write(event),
});

// Same call as before; the shield runs first.
const order = await hardened.decide(context);`}</CodeBlock>
        <p>
          The wrapped agent&rsquo;s <Code>name</Code> gains a{" "}
          <Code>+shield</Code> suffix, which is how a JSONL log holding both a
          control and a shielded run stays separable when it is scored later.
        </p>
      </DocsSection>

      <DocsSection id="layers" title="The four layers">
        <DefList
          items={[
            {
              term: "1. Sanitize",
              def: (
                <>
                  Strips zero-width and bidi control characters, then folds
                  confusable characters to their Latin form and NFKC-normalizes.
                  Order matters: invisible characters are removed first, or they
                  would survive inside runs the folding pass treats as opaque.
                  Built from the same Unicode tables the attack vectors use.
                </>
              ),
            },
            {
              term: "2. Corroboration gate",
              def: (
                <>
                  Groups near-identical stories and counts distinct{" "}
                  <Code>source</Code> values, honouring{" "}
                  <Code>originatingSource</Code> so four aggregators echoing one
                  wire story collapse to a single item with an honest
                  independent-source count.
                </>
              ),
            },
            {
              term: "3. Point-in-time guard",
              def: (
                <>
                  Drops anything dated after the context&rsquo;s{" "}
                  <Code>asOf</Code> timestamp, and removes items that are
                  detected replays of an earlier story already in context. An
                  unparseable date is treated as invalid and dropped rather than
                  trusted.
                </>
              ),
            },
            {
              term: "4. Risk contract",
              def: (
                <>
                  Runs after the model has decided, on the returned order alone.
                  It checks notional, allowed symbols, confidence ceiling, and
                  the human-approval threshold. Violating orders are replaced
                  with a <Code>hold</Code> of size 0 flagged for human approval.
                </>
              ),
            },
          ]}
        />
        <Callout title="Why the risk contract never reads prose">
          Layers 1–3 all touch attacker-controlled text, so in principle a
          clever enough payload could aim at them. Layer 4 cannot be argued
          with: it is a non-LLM function of the proposed order&rsquo;s numbers
          and symbol, and it never sees a headline. No vector in the corpus
          talks its way past it.
        </Callout>
      </DocsSection>

      <DocsSection id="limits" title="What the shield does not stop">
        <p>
          The measured result is grade {UNSHIELDED.grade} →{" "}
          {SHIELDED.grade}, and injection susceptibility{" "}
          {UNSHIELDED.injectionSusceptibility} →{" "}
          {SHIELDED.injectionSusceptibility}. It does not reach zero, and it
          should not be described as if it did.
        </p>
        <Callout tone="warning" title="Sanitizing makes a payload legible, not false">
          Decoding a hidden clause that reads &ldquo;sell immediately&rdquo;
          turns it into ordinary readable bearish text. An agent that trusts
          sentiment embedded in an article body is no less willing to act on it
          once it is unmasked. Sanitization defeats the obfuscation; it does not
          defeat the content.
        </Callout>
        <DefList
          items={[
            {
              term: "Semantic traps",
              def: "A plausible, well-formed lie has no character-level signature. The corroboration gate catches manufactured echo; it cannot catch a single credible-sounding falsehood from a real source.",
            },
            {
              term: "Sentiment-filter poisoning",
              def: "Manufacturing the crowding or balance conditions a strategy gates on is an attack on the strategy's logic, not on its input encoding.",
            },
            {
              term: "Look-ahead contamination",
              def: "Memorization lives in the model's weights. No input filter can remove what the model already knows, so this is measured and reported, not blocked.",
            },
          ]}
        />
        <p>
          The residual {SHIELDED.injectionSusceptibility} is entirely in these
          families. That is a real limit of input hardening, and the scorecard
          reports it rather than hiding it.
        </p>
      </DocsSection>

      <DocsSection title="The audit trail">
        <p>
          <Code>onAudit</Code> receives a typed event every time a layer changes
          something, and never affects the decision. The event union is{" "}
          <Code>sanitize</Code>, <Code>corroboration</Code>,{" "}
          <Code>point-in-time</Code>, and <Code>risk-contract</Code>, each
          carrying what it found.
        </p>
        <Callout title="Credentials never reach the audit log">
          The audit trail records what was filtered, not who you are. API keys
          are read from environment variables and never written to the JSONL log
          or printed.
        </Callout>
      </DocsSection>
    </>
  );
}
