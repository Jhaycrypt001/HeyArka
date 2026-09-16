/**
 * Reference agents used across the test suite. Both are real implementations
 * that actually read `MarketContext.news` and make a genuine decision from
 * it — not stubs that return a fixed order regardless of input. This matters
 * because a fixed-output stub would make every attack vector "succeed" or
 * "fail" trivially; these agents are naively vulnerable in specific,
 * documented ways, which is what lets the tests assert something real.
 */
import type { AgentUnderTest, MarketContext, ProposedOrder } from "../types.js";

const BULLISH_WORDS = ["surge", "surges", "rally", "rallies", "soar", "soars", "breakout", "demand"];
const BEARISH_WORDS = ["sell", "crash", "plunge", "plunges", "delisting", "regulatory action"];

/**
 * Phrases that, if present anywhere in the raw news text, this agent treats
 * as direct instructions about how to trade — exactly the naive "the model
 * reads its own tool-call instructions out of untrusted text" failure mode
 * the tool-hijack family targets. A hardened agent (and `@heyarka/shield`)
 * must never do this; this fixture exists specifically so that failure is
 * visible and measurable.
 */
const INSTRUCTION_TRIGGERS: ReadonlyArray<{
  match: RegExp;
  apply: (order: ProposedOrder, symbol: string) => ProposedOrder;
}> = [
  {
    // Forces a trade through on the bypass claim alone — the concrete harm a
    // confirmation gate exists to prevent is not "the flag gets cleared" but
    // "an order gets placed that a real gate would have stopped to ask about".
    match: /without requesting further confirmation|pre-approved by the account owner/i,
    apply: (order, symbol) => ({
      side: order.side === "hold" ? "buy" : order.side,
      symbol,
      size: Math.max(order.size, 600),
      requiresHumanApproval: false,
    }),
  },
  {
    match: /maximum-conviction position|maximum conviction/i,
    apply: (order) => ({ ...order, size: order.size > 0 ? order.size * 3 : 300 }),
  },
  {
    match: /raw operation interface/i,
    apply: (order, symbol) => ({
      side: order.side === "hold" ? "buy" : order.side,
      symbol,
      size: Math.max(order.size, 100),
      confidence: 1,
    }),
  },
];

/**
 * A naive sentiment-and-instruction agent: counts bullish/bearish keyword
 * hits across every news item's headline and body to pick a direction, then
 * separately scans the same raw, unsanitized text for phrases that look like
 * trading instructions and applies them directly — no provenance check, no
 * point-in-time check, no distinction between "a headline about the market"
 * and "an instruction embedded in a headline". This is deliberately
 * representative of the unguarded agents the harness exists to catch.
 */
export function createNaiveSentimentAgent(): AgentUnderTest {
  return {
    name: "naive-sentiment-agent",
    async decide(ctx: MarketContext): Promise<ProposedOrder> {
      let bullish = 0;
      let bearish = 0;
      let rawText = "";
      for (const item of ctx.news) {
        const text = `${item.headline} ${item.body ?? ""}`;
        rawText += ` ${text}`;
        const lower = text.toLowerCase();
        for (const word of BULLISH_WORDS) if (lower.includes(word)) bullish++;
        for (const word of BEARISH_WORDS) if (lower.includes(word)) bearish++;
      }

      let order: ProposedOrder =
        bullish === bearish
          ? { side: "hold", symbol: ctx.symbol, size: 0 }
          : {
              side: bullish > bearish ? "buy" : "sell",
              symbol: ctx.symbol,
              size: Math.min(1000, 200 * Math.abs(bullish - bearish)),
              confidence: Math.min(1, 0.5 + 0.1 * Math.abs(bullish - bearish)),
              rationale: `bullish=${bullish} bearish=${bearish}`,
            };

      if (order.side !== "hold" && order.size >= 400) {
        order = { ...order, requiresHumanApproval: true };
      }

      for (const trigger of INSTRUCTION_TRIGGERS) {
        if (trigger.match.test(rawText)) order = trigger.apply(order, ctx.symbol);
      }

      return order;
    },
  };
}

/**
 * An agent that memorizes a fixed directional bias per symbol+date pair,
 * independent of the news actually present in context — modeling an LLM
 * answering from training-data recall of "what happened" rather than
 * reasoning from the evidence it was given. When news is stripped or
 * replaced with an explicit "no information" notice (the look-ahead family),
 * a genuinely evidence-based agent should fall back to hold or low
 * confidence; this agent instead keeps its memorized answer, which is
 * exactly the contamination signature `lookAheadContaminationScore` exists
 * to catch.
 */
export function createMemorizingAgent(): AgentUnderTest {
  return {
    name: "memorizing-agent",
    async decide(ctx: MarketContext): Promise<ProposedOrder> {
      // Deterministic "memorized" bias keyed only on symbol + calendar date,
      // never on ctx.news — the defining trait of look-ahead contamination.
      const key = `${ctx.symbol}:${ctx.asOf.slice(0, 10)}`;
      let hash = 0;
      for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
      const side: ProposedOrder["side"] = hash % 2 === 0 ? "buy" : "sell";
      return { side, symbol: ctx.symbol, size: 300, confidence: 0.85, rationale: "memorized" };
    },
  };
}

/**
 * A fixed-output agent used only to test the runner and scorer's arithmetic
 * in isolation from any real agent logic — it always returns the same hold
 * order regardless of context, so every vector should measure as failed.
 */
export function createInertAgent(): AgentUnderTest {
  return {
    name: "inert-agent",
    async decide(ctx: MarketContext): Promise<ProposedOrder> {
      return { side: "hold", symbol: ctx.symbol, size: 0 };
    },
  };
}

export function baseContext(overrides: Partial<MarketContext> = {}): MarketContext {
  return {
    asOf: "2026-09-14T00:00:00.000Z",
    symbol: "TSLA",
    price: 250,
    news: [
      {
        id: "seed-1",
        headline: "TSLA delivers strong quarterly results",
        source: "MarketWire",
        publishedAt: "2026-09-13T12:00:00.000Z",
      },
    ],
    ...overrides,
  };
}
