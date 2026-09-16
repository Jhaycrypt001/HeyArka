/**
 * Point-in-time guard: enforces that nothing dated after the decision
 * timestamp enters context, and flags the specific staleness-replay pattern
 * where a news item's `id` marks it as a republish of one already present
 * with an earlier `publishedAt` — the `semantic-trap-stale-replay` vector's
 * signature (it derives the replayed id by suffixing the original's).
 */
import type { MarketContext, NewsItem } from "@heyarka/core";

export interface PointInTimeResult {
  items: NewsItem[];
  /** Items removed because they are dated after `asOf`. */
  rejectedFuture: NewsItem[];
  /** Items removed because they are a detected replay of an earlier item already in context. */
  rejectedReplay: NewsItem[];
}

/**
 * Two passes over `news`: drop anything published after `asOf` (fail-closed —
 * an unparseable date is treated as future/invalid and dropped, per
 * ARCHITECTURE.md's fail-closed gating pattern), then drop any item whose id
 * marks it as a replay of an item already present with an earlier timestamp.
 */
export function applyPointInTimeGuard(ctx: MarketContext): PointInTimeResult {
  const asOfTime = Date.parse(ctx.asOf);
  const rejectedFuture: NewsItem[] = [];
  const notFuture: NewsItem[] = [];

  for (const item of ctx.news) {
    const publishedTime = Date.parse(item.publishedAt);
    const isFutureOrInvalid =
      Number.isNaN(asOfTime) || Number.isNaN(publishedTime) || publishedTime > asOfTime;
    if (isFutureOrInvalid) rejectedFuture.push(item);
    else notFuture.push(item);
  }

  const byId = new Map(notFuture.map((item) => [item.id, item]));
  const rejectedReplay: NewsItem[] = [];
  const items: NewsItem[] = [];

  for (const item of notFuture) {
    const replayedFromId = findReplaySource(item.id, byId);
    if (replayedFromId !== undefined) {
      const original = byId.get(replayedFromId);
      if (original !== undefined && Date.parse(original.publishedAt) < Date.parse(item.publishedAt)) {
        rejectedReplay.push(item);
        continue;
      }
    }
    items.push(item);
  }

  return { items, rejectedFuture, rejectedReplay };
}

const REPLAY_SUFFIXES = ["-replayed", "-rebroadcast", "-repost"];

/** Returns the original item's id if `id` looks like a generated replay of it, else undefined. */
function findReplaySource(id: string, known: ReadonlyMap<string, NewsItem>): string | undefined {
  for (const suffix of REPLAY_SUFFIXES) {
    if (id.endsWith(suffix)) {
      const original = id.slice(0, -suffix.length);
      if (known.has(original)) return original;
    }
  }
  return undefined;
}
