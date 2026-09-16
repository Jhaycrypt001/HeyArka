import { describe, expect, it } from "vitest";
import { applyCorroborationGate } from "./corroboration.js";
import type { NewsItem } from "@heyarka/core";

function item(overrides: Partial<NewsItem> & Pick<NewsItem, "id" | "headline" | "source" | "publishedAt">): NewsItem {
  return overrides;
}

describe("applyCorroborationGate", () => {
  it("passes through genuinely independent items unchanged", () => {
    const items = [
      item({ id: "a", headline: "TSLA delivers strong results", source: "Reuters", publishedAt: "2026-09-14T00:00:00.000Z" }),
      item({ id: "b", headline: "Fed holds rates steady", source: "Bloomberg", publishedAt: "2026-09-14T01:00:00.000Z" }),
    ];
    const result = applyCorroborationGate(items);
    expect(result.items).toHaveLength(2);
    expect(result.collapsed).toEqual([]);
  });

  it("collapses items sharing an explicit originatingSource to one representative", () => {
    const wireId = "TSLA-unverified-wire";
    const items = [
      item({ id: "e0", headline: "Sources say TSLA facing delisting review", source: "MarketPulse", originatingSource: wireId, publishedAt: "2026-09-14T00:00:00.000Z" }),
      item({ id: "e1", headline: "Sources say TSLA facing delisting review", source: "FinWire Daily", originatingSource: wireId, publishedAt: "2026-09-14T00:01:00.000Z" }),
      item({ id: "e2", headline: "Sources say TSLA facing delisting review", source: "TraderFeed", originatingSource: wireId, publishedAt: "2026-09-14T00:02:00.000Z" }),
      item({ id: "e3", headline: "Sources say TSLA facing delisting review", source: "AlphaScoop", originatingSource: wireId, publishedAt: "2026-09-14T00:03:00.000Z" }),
    ];
    const result = applyCorroborationGate(items);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("e0"); // earliest by publishedAt
    expect(result.collapsed).toHaveLength(1);
    expect(result.collapsed[0]).toMatchObject({
      representative: "e0",
      independentSourceCount: 4,
    });
    expect(result.collapsed[0]?.collapsedIds.sort()).toEqual(["e1", "e2", "e3"]);
  });

  it("collapses near-duplicate headlines lacking an explicit originatingSource", () => {
    const items = [
      item({ id: "f0", headline: "Everyone is piling into TSLA right now", source: "MomentumFeed", publishedAt: "2026-09-14T00:00:00.000Z" }),
      item({ id: "f1", headline: "everyone is piling into tsla right now!", source: "TrendWire", publishedAt: "2026-09-14T00:01:00.000Z" }),
    ];
    const result = applyCorroborationGate(items);
    expect(result.items).toHaveLength(1);
    expect(result.collapsed[0]?.independentSourceCount).toBe(2);
  });

  it("does not collapse genuinely different headlines even from the same source", () => {
    const items = [
      item({ id: "g0", headline: "TSLA delivers strong results", source: "Reuters", publishedAt: "2026-09-14T00:00:00.000Z" }),
      item({ id: "g1", headline: "TSLA announces new factory", source: "Reuters", publishedAt: "2026-09-14T01:00:00.000Z" }),
    ];
    const result = applyCorroborationGate(items);
    expect(result.items).toHaveLength(2);
  });
});
