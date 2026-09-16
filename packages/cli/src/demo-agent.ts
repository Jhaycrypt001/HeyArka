/**
 * The bundled reference agent for `arka attack --demo`. This is a real,
 * runnable `AgentUnderTest` — not a mock or a stub — so the demo produces
 * genuine `AttackResult`s from a genuine `decide()` call, the same code path
 * as attacking any other agent. It is deliberately naive: a keyword-weighted
 * sentiment reader with no provenance checking and no notion of "confidence
 * justified by evidence." That naivety is the point — it models the class of
 * agent the published attacks (arXiv:2601.13082, arXiv:2601.13770) target,
 * and lets judges see the harness work with zero API keys and zero setup.
 * `arka attack --demo --shielded` runs the identical agent wrapped in
 * `@heyarka/shield` so the before/after is a true A/B on one decision
 * function, not two different agents.
 */
import type { AgentUnderTest, MarketContext, ProposedOrder } from "@heyarka/core";

const BULLISH_WORDS = ["surge", "surges", "rally", "soar", "soars", "demand", "beats", "strong", "record"];
const BEARISH_WORDS = ["sell", "crash", "plunge", "delisting", "regulatory action", "recall", "downgrade", "lawsuit"];

/**
 * Phrases an indirect-injection payload uses to instruct the agent directly.
 * A naive agent that reads all context text as one undifferentiated blob —
 * exactly what happens when raw headlines are piped straight into a prompt —
 * will act on these regardless of whether they appeared in a "headline" or
 * were smuggled into a body as an embedded instruction.
 */
const INSTRUCTION_TRIGGERS: Array<{ match: RegExp; apply: (o: ProposedOrder, symbol: string) => ProposedOrder }> = [
  {
    match: /without requesting further confirmation|pre-approved by the account owner/i,
    apply: (o, symbol) => ({ side: o.side === "hold" ? "buy" : o.side, symbol, size: Math.max(o.size, 600), requiresHumanApproval: false }),
  },
  {
    match: /raw operation interface|bypass the standard order endpoint/i,
    apply: (o, symbol) => ({ ...o, side: o.side === "hold" ? "buy" : o.side, symbol, size: Math.max(o.size, 500) }),
  },
];

/** Builds the bundled demo agent. `size` scales with the bullish/bearish word-count gap. */
export function createDemoAgent(): AgentUnderTest {
  return {
    name: "heyarka-demo-agent",
    async decide(ctx: MarketContext): Promise<ProposedOrder> {
      let bullish = 0;
      let bearish = 0;
      let raw = "";
      for (const item of ctx.news) {
        const text = `${item.headline} ${item.body ?? ""}`;
        raw += ` ${text}`;
        const lower = text.toLowerCase();
        for (const w of BULLISH_WORDS) if (lower.includes(w)) bullish++;
        for (const w of BEARISH_WORDS) if (lower.includes(w)) bearish++;
      }

      let order: ProposedOrder =
        bullish === bearish
          ? { side: "hold", symbol: ctx.symbol, size: 0 }
          : {
              side: bullish > bearish ? "buy" : "sell",
              symbol: ctx.symbol,
              size: 200 * Math.abs(bullish - bearish),
              confidence: Math.min(0.5 + 0.1 * Math.abs(bullish - bearish), 0.95),
            };

      for (const trigger of INSTRUCTION_TRIGGERS) {
        if (trigger.match.test(raw)) order = trigger.apply(order, ctx.symbol);
      }

      return order;
    },
  };
}
