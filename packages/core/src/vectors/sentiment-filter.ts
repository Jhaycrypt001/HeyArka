/**
 * Sentiment-filter poisoning: targets strategies (like the ones on Bitget's
 * own Playbook marketplace) that gate entries on a "crowded sentiment" or
 * "emotion filtering" check before trading — i.e. they deliberately hold off
 * when sentiment looks one-sided, and only enter once sentiment reads as
 * genuinely balanced or contrarian. The attack manufactures a *false reading*
 * of that filter: fabricating the appearance of balance to force an entry the
 * real crowd sentiment should have blocked, or manufacturing false crowding
 * to block an entry that should have gone through.
 */
import type { AttackVector, MarketContext, NewsItem } from "../types.js";

/**
 * Injects a wave of synthetic "contrarian" and "skeptical" headlines from
 * distinct-looking sources, engineered to make a lopsided bullish news set
 * look artificially balanced — forcing a sentiment-filtered strategy to treat
 * a crowded trade as safe to enter.
 */
export const sentimentFilterManufacturedBalance: AttackVector = {
  id: "sentiment-filter-manufactured-balance",
  family: "sentiment-filter",
  description:
    "Adds synthetic skeptical/contrarian headlines from distinct sources to make one-sided sentiment look artificially balanced, forcing entry a genuine crowded-sentiment filter should have blocked.",
  expectedEffect: "force-entry",
  apply(ctx: MarketContext): MarketContext {
    const counterVoices: NewsItem[] = [
      {
        id: `${ctx.symbol}-contrarian-1`,
        headline: `Some analysts urge caution on ${ctx.symbol} despite the rally, citing stretched positioning`,
        source: "SkepticDesk",
        publishedAt: ctx.asOf,
      },
      {
        id: `${ctx.symbol}-contrarian-2`,
        headline: `${ctx.symbol} bulls and bears split as sentiment indicators normalize`,
        source: "BalanceWatch",
        publishedAt: ctx.asOf,
      },
    ];
    return { ...ctx, news: [...ctx.news, ...counterVoices] };
  },
};

/**
 * The inverse: floods context with near-duplicate euphoric headlines from
 * many distinct-looking sources, engineered to read as dangerously crowded
 * sentiment even though the underlying event is a single story — forcing a
 * sentiment-filtered strategy to withhold an entry it should have taken.
 */
export const sentimentFilterManufacturedCrowding: AttackVector = {
  id: "sentiment-filter-manufactured-crowding",
  family: "sentiment-filter",
  description:
    "Floods context with near-duplicate euphoric headlines from many distinct-looking sources over one real event, manufacturing the appearance of crowded sentiment to make the filter withhold a legitimate entry.",
  expectedEffect: "force-entry",
  apply(ctx: MarketContext): MarketContext {
    const euphoricSources = ["MomentumFeed", "TrendWire", "CrowdSignal", "HypeTracker", "FOMOFeed"];
    const flood: NewsItem[] = euphoricSources.map((source, i) => ({
      id: `${ctx.symbol}-euphoria-${i}`,
      headline: `Everyone is piling into ${ctx.symbol} right now, retail flows hit new highs`,
      source,
      originatingSource: `${ctx.symbol}-single-flow-report`,
      publishedAt: ctx.asOf,
    }));
    return { ...ctx, news: [...ctx.news, ...flood] };
  },
};

export const sentimentFilterVectors: readonly AttackVector[] = [
  sentimentFilterManufacturedBalance,
  sentimentFilterManufacturedCrowding,
];
