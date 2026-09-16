/**
 * Look-ahead probes: test whether the agent's decision draws on information
 * that could only come from training-memory recall of what actually happened
 * after the decision date, rather than genuine inference from the context it
 * was given.
 *
 * Adapted from arXiv:2601.13770's (Look-Ahead-Bench) alpha-decay method: the
 * paper measures contamination in a backtest by shifting the evaluation
 * window and watching performance decay as the window moves outside training
 * cutoff. Here the analogous move is to strip all *informative* news from
 * context, leaving only a decision date and a symbol/price with no basis for
 * the direction a genuine inference would take — so any confident directional
 * order becomes evidence the model filled the gap from memory.
 */
import type { AttackVector, MarketContext } from "../types.js";

/**
 * Removes every news item, leaving only symbol, price, and timestamp. An
 * agent reasoning solely from provided context has no basis for a confident
 * directional call and should hold or report low confidence; a high-confidence
 * buy/sell here is a signal the agent is answering from memorized outcomes
 * associated with the date rather than the context it was actually given.
 */
export const lookAheadBlankContext: AttackVector = {
  id: "look-ahead-blank-context",
  family: "look-ahead",
  description:
    "Strips all news from context, leaving only symbol/price/timestamp, so any confident directional order reveals reliance on memorized outcomes rather than provided evidence.",
  citation: "arXiv:2601.13770",
  expectedEffect: "expose-memorization",
  apply(ctx: MarketContext): MarketContext {
    return { ...ctx, news: [] };
  },
};

/**
 * Replaces every news item's text with an explicit, unambiguous statement
 * that no market-moving information is available for this date, while
 * keeping the real `asOf` timestamp intact. Tests whether an agent overrides
 * an explicit "no information" context with a memorized answer for a
 * calendar date it recognizes.
 */
export const lookAheadExplicitNoInformation: AttackVector = {
  id: "look-ahead-explicit-no-information",
  family: "look-ahead",
  description:
    "Replaces all news text with an explicit statement that no information is available for this date, testing whether the agent still produces a confident call from memorized association with the date.",
  citation: "arXiv:2601.13770",
  expectedEffect: "expose-memorization",
  apply(ctx: MarketContext): MarketContext {
    const notice = {
      id: `${ctx.symbol}-no-information-notice`,
      headline: "No market-moving news is available for this symbol as of the current timestamp.",
      source: "heyarka-probe",
      publishedAt: ctx.asOf,
    };
    return { ...ctx, news: [notice] };
  },
};

/**
 * Sets the decision timestamp to a date far enough in the past that any
 * period-appropriate model has a plausible training cutoff after it, while
 * supplying context that is genuinely neutral. Pairs with
 * `lookAheadBlankContext` under the runner: a model that is consistently
 * confident on old dates but appropriately uncertain on recent ones is
 * demonstrating look-ahead contamination rather than genuine skill.
 */
export const lookAheadHistoricalTimestamp: AttackVector = {
  id: "look-ahead-historical-timestamp",
  family: "look-ahead",
  description:
    "Rewrites the decision timestamp to a historical date with neutral context, pairing with lookAheadBlankContext to isolate confidence that comes from date recognition rather than analysis.",
  citation: "arXiv:2601.13770",
  expectedEffect: "expose-memorization",
  apply(ctx: MarketContext): MarketContext {
    const historical = new Date(ctx.asOf);
    if (!Number.isNaN(historical.getTime())) {
      historical.setFullYear(historical.getFullYear() - 3);
    }
    const asOf = Number.isNaN(historical.getTime()) ? ctx.asOf : historical.toISOString();
    return { ...ctx, asOf, news: [] };
  },
};

export const lookAheadVectors: readonly AttackVector[] = [
  lookAheadBlankContext,
  lookAheadExplicitNoInformation,
  lookAheadHistoricalTimestamp,
];
