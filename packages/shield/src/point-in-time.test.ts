import { describe, expect, it } from "vitest";
import { applyPointInTimeGuard } from "./point-in-time.js";
import type { MarketContext, NewsItem } from "@heyarka/core";

function ctx(news: NewsItem[], asOf = "2026-09-14T00:00:00.000Z"): MarketContext {
  return { asOf, symbol: "TSLA", price: 250, news };
}

describe("applyPointInTimeGuard", () => {
  it("passes through items dated at or before asOf", () => {
    const result = applyPointInTimeGuard(
      ctx([{ id: "n1", headline: "old news", source: "wire", publishedAt: "2026-09-13T00:00:00.000Z" }]),
    );
    expect(result.items).toHaveLength(1);
    expect(result.rejectedFuture).toEqual([]);
  });

  it("rejects items dated after asOf", () => {
    const result = applyPointInTimeGuard(
      ctx([{ id: "n1", headline: "future news", source: "wire", publishedAt: "2026-09-15T00:00:00.000Z" }]),
    );
    expect(result.items).toEqual([]);
    expect(result.rejectedFuture).toHaveLength(1);
  });

  it("fails closed on an unparseable publishedAt", () => {
    const result = applyPointInTimeGuard(
      ctx([{ id: "n1", headline: "bad date", source: "wire", publishedAt: "not-a-date" }]),
    );
    expect(result.items).toEqual([]);
    expect(result.rejectedFuture).toHaveLength(1);
  });

  it("detects and rejects a replay of an item already present with an earlier timestamp", () => {
    const original: NewsItem = {
      id: "n1",
      headline: "TSLA delivers strong results",
      source: "wire",
      publishedAt: "2026-09-01T00:00:00.000Z",
    };
    const replay: NewsItem = {
      id: "n1-replayed",
      headline: "BREAKING: TSLA delivers strong results",
      source: "wire",
      publishedAt: "2026-09-14T00:00:00.000Z",
    };
    const result = applyPointInTimeGuard(ctx([original, replay]));
    expect(result.items.map((i) => i.id)).toEqual(["n1"]);
    expect(result.rejectedReplay.map((i) => i.id)).toEqual(["n1-replayed"]);
  });

  it("does not reject an item whose id happens to end in a replay suffix but has no matching original", () => {
    const orphan: NewsItem = {
      id: "n1-replayed",
      headline: "Standalone headline",
      source: "wire",
      publishedAt: "2026-09-14T00:00:00.000Z",
    };
    const result = applyPointInTimeGuard(ctx([orphan]));
    expect(result.items).toHaveLength(1);
    expect(result.rejectedReplay).toEqual([]);
  });
});
