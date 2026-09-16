import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRssItems, filterByWindow } from "./news-source.js";

// Real feed content captured live from https://cointelegraph.com/rss during
// development (verified reachable via curl, HTTP 200) — not a fabricated
// or hand-written sample. Parsing this proves the extractor against the
// feed's actual shape, including its CDATA-wrapped <description>/<link> and
// plain (non-CDATA) <title>.
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "test-fixtures", "cointelegraph-rss-sample.xml");
const REAL_FEED_XML = readFileSync(FIXTURE_PATH, "utf8");

describe("parseRssItems", () => {
  it("parses every real <item> in the captured feed", () => {
    const items = parseRssItems(REAL_FEED_XML);
    expect(items.length).toBe(30);
  });

  it("extracts the real first item's fields correctly", () => {
    const items = parseRssItems(REAL_FEED_XML);
    const first = items[0];
    expect(first).toBeDefined();
    expect(first?.headline).toBe("EU cyber rules put crypto wallet makers on 24-hour reporting clock");
    expect(first?.source).toBe("Cointelegraph by Zoltan Vardai");
    expect(first?.id).toBe("https://cointelegraph.com/news/eu-cyber-rules-put-crypto-wallet-24-hour-reporting");
    expect(first?.url).toBe(first?.id);
    expect(first?.publishedAt).toBe(new Date("Mon, 14 Sep 2026 11:38:44 +0000").toISOString());
  });

  it("gives every parsed item a non-empty id, headline, source, and ISO publishedAt", () => {
    const items = parseRssItems(REAL_FEED_XML);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.headline.length).toBeGreaterThan(0);
      expect(item.source.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false);
    }
  });

  it("returns an empty array for XML with no <item> blocks", () => {
    expect(parseRssItems("<rss><channel><title>empty</title></channel></rss>")).toEqual([]);
  });

  it("skips a malformed item missing a required field instead of throwing", () => {
    const malformed = `<rss><channel><item><title>No guid or date here</title></item></channel></rss>`;
    expect(parseRssItems(malformed)).toEqual([]);
  });
});

describe("filterByWindow", () => {
  const items = parseRssItems(REAL_FEED_XML);

  it("keeps only items within the window before asOf, on the real parsed data", () => {
    const asOf = new Date("2026-09-14T12:00:00.000Z");
    const filtered = filterByWindow(items, { asOf, windowMs: 60 * 60 * 1000 });
    expect(filtered.length).toBeGreaterThan(0);
    for (const item of filtered) {
      const publishedMs = Date.parse(item.publishedAt);
      expect(publishedMs).toBeLessThanOrEqual(asOf.getTime());
      expect(publishedMs).toBeGreaterThanOrEqual(asOf.getTime() - 60 * 60 * 1000);
    }
  });

  it("excludes items published after asOf, enforcing point-in-time discipline", () => {
    const veryEarly = new Date("2000-01-01T00:00:00.000Z");
    expect(filterByWindow(items, { asOf: veryEarly, windowMs: 365 * 24 * 60 * 60 * 1000 })).toEqual([]);
  });

  it("excludes items older than the window even though they are before asOf", () => {
    const asOf = new Date("2026-09-14T12:00:00.000Z");
    const filtered = filterByWindow(items, { asOf, windowMs: 1 });
    expect(filtered.length).toBeLessThan(items.length);
  });
});
