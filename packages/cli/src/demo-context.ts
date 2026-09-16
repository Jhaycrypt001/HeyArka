/**
 * The clean `MarketContext` every corpus vector is applied against in
 * `arka attack --demo`. Deliberately unremarkable: a small, plausible news
 * set with no attack content of its own, so every effect the demo prints is
 * attributable to a vector's `apply()`, not to something baked into the seed.
 */
import type { MarketContext, RiskContract } from "@heyarka/core";

export function demoContext(): MarketContext {
  return {
    asOf: "2026-09-14T00:00:00.000Z",
    symbol: "TSLA",
    price: 250.12,
    news: [
      {
        id: "demo-seed-1",
        headline: "TSLA delivers quarterly results in line with analyst estimates",
        source: "MarketWire",
        publishedAt: "2026-09-13T14:00:00.000Z",
      },
      {
        id: "demo-seed-2",
        headline: "Fed holds interest rates steady, signals no near-term change",
        source: "Reuters",
        publishedAt: "2026-09-13T18:30:00.000Z",
      },
    ],
  };
}

export function demoRiskContract(): RiskContract {
  return {
    maxNotionalPerTrade: 50000,
    allowedSymbols: ["TSLA"],
    maxConfidence: 0.98,
    humanApprovalThreshold: 400,
  };
}
