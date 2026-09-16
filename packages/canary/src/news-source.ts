/**
 * Real news ingestion for the canary: fetches and parses a live public RSS
 * feed (Cointelegraph, no API key required) over an actual HTTPS request.
 * No canned or generated headlines anywhere in this file — if the feed is
 * unreachable, `fetchLatestNews` throws rather than substituting anything.
 *
 * The parser is a minimal, hand-rolled RSS 2.0 <item> extractor scoped to
 * exactly the fields this feed reliably provides (title, link, guid,
 * pubDate, dc:creator as source). It is not a general XML parser — Node has
 * no built-in one, and pulling in a full XML/RSS dependency for three fields
 * from one well-known feed shape is more machinery than this needs.
 */
import type { NewsItem } from "@heyarka/core";

const FEED_URL = "https://cointelegraph.com/rss";

/** Bounded so a stalled feed cannot hang a tick indefinitely. */
const FEED_TIMEOUT_MS = 20_000;

function extractTag(itemXml: string, tag: string): string | undefined {
  const cdataMatch = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdataMatch?.[1] !== undefined) return cdataMatch[1].trim();
  const plainMatch = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return plainMatch?.[1]?.trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/** Exported for testing against a real captured feed sample without a network call. */
export function parseRssItems(xml: string): NewsItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items: NewsItem[] = [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const guid = extractTag(block, "guid");
    const pubDate = extractTag(block, "pubDate");
    const creator = extractTag(block, "dc:creator");
    if (!title || !guid || !pubDate) continue;

    const publishedAt = new Date(pubDate).toISOString();
    items.push({
      id: guid,
      headline: decodeEntities(title),
      source: creator ? decodeEntities(creator) : "Cointelegraph",
      publishedAt,
      url: guid,
    });
  }

  return items;
}

/** Exported for testing the point-in-time window logic without a network call. */
export function filterByWindow(items: NewsItem[], options: { asOf: Date; windowMs: number }): NewsItem[] {
  const asOfMs = options.asOf.getTime();
  const earliestMs = asOfMs - options.windowMs;

  return items.filter((item) => {
    const publishedMs = Date.parse(item.publishedAt);
    return Number.isFinite(publishedMs) && publishedMs <= asOfMs && publishedMs >= earliestMs;
  });
}

/**
 * Fetches the live feed and returns NewsItems published at or before `asOf`
 * (defends the canary's own point-in-time discipline at the source, on top
 * of the shield's own point-in-time guard) within `windowMs` before it.
 */
export async function fetchLatestNews(options: { asOf: Date; windowMs: number }): Promise<NewsItem[]> {
  const response = await fetch(FEED_URL, {
    headers: { "User-Agent": "HeyArka-Canary/0.1 (+https://github.com)" },
    // Bounded for the same reason as the Bitget client: an unbounded fetch that
    // stalls stops the canary's loop silently instead of raising a tick error.
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch news feed ${FEED_URL}: HTTP ${response.status}`);
  }
  const xml = await response.text();
  const items = parseRssItems(xml);
  return filterByWindow(items, options);
}
