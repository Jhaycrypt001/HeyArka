/**
 * The canary's reference decision function: a real, runnable
 * `AgentUnderTest` — a keyword-weighted sentiment reader over the live news
 * window, exactly the class of naive agent arXiv:2601.13082 and
 * arXiv:2601.13770 target. It is intentionally simple; the point of the
 * canary is not to prove this trading strategy is good, but to prove that
 * wrapping *the same* decision function in `@heyarka/shield` measurably
 * changes its real, non-simulated outcome on live paper-trading accounts.
 */
import type { AgentUnderTest, MarketContext, ProposedOrder } from "@heyarka/core";

const BULLISH_WORDS = ["surge", "surges", "rally", "soar", "soars", "demand", "beats", "strong", "record", "adoption", "bullish"];
const BEARISH_WORDS = ["sell", "crash", "plunge", "delisting", "regulatory action", "recall", "downgrade", "lawsuit", "hack", "bearish"];

export interface SentimentAgentOptions {
  /** Base notional (quote currency) for a decisive signal. Actual size scales with the sentiment gap. */
  baseNotional: number;
  /** Maximum notional this agent will ever propose, regardless of signal strength. */
  maxNotional: number;
}

/** Builds the canary's reference sentiment agent, bounded to `options.maxNotional` by construction. */
export function createSentimentAgent(options: SentimentAgentOptions): AgentUnderTest {
  const { baseNotional, maxNotional } = options;
  return {
    name: "heyarka-canary-sentiment-agent",
    async decide(ctx: MarketContext): Promise<ProposedOrder> {
      let bullish = 0;
      let bearish = 0;
      for (const item of ctx.news) {
        const lower = `${item.headline} ${item.body ?? ""}`.toLowerCase();
        for (const w of BULLISH_WORDS) if (lower.includes(w)) bullish++;
        for (const w of BEARISH_WORDS) if (lower.includes(w)) bearish++;
      }

      if (bullish === bearish) {
        return { side: "hold", symbol: ctx.symbol, size: 0 };
      }

      const gap = Math.abs(bullish - bearish);
      const size = Math.min(baseNotional * gap, maxNotional);

      return {
        side: bullish > bearish ? "buy" : "sell",
        symbol: ctx.symbol,
        size,
        confidence: Math.min(0.5 + 0.1 * gap, 0.95),
        rationale: `sentiment gap ${bullish} bullish vs ${bearish} bearish across ${ctx.news.length} live news item(s)`,
      };
    },
  };
}
