/**
 * Source-corroboration gate: defeats the `semantic-trap` echo-chamber vector
 * and the `sentiment-filter` manufactured-crowding vector, both of which work
 * by republishing one story under several distinct-looking source names.
 *
 * The gate does not need to know which stories are true — only how many
 * *independent* origins actually confirm each one, using `originatingSource`
 * when present and falling back to near-duplicate headline detection when an
 * attacker omits it (an honest attacker simulation would set it; a stronger
 * one that hides its tracks would not, so the fallback matters).
 */
import type { NewsItem } from "@heyarka/core";

export interface CorroborationResult {
  /** News items that survive: either genuinely independent, or the sole representative of an echoed group. */
  items: NewsItem[];
  /** One entry per collapsed group, for the audit trail. */
  collapsed: Array<{ representative: string; collapsedIds: string[]; independentSourceCount: number }>;
}

/** Loose normalization so near-duplicate headlines (whitespace/case/punctuation) group together. */
function headlineKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Groups news items by `originatingSource` when set, otherwise by normalized
 * headline text. Within each group, counts distinct `source` values as the
 * independent-corroboration count, keeps only the earliest item as the
 * group's representative, and reports every other item as collapsed.
 */
export function applyCorroborationGate(items: readonly NewsItem[]): CorroborationResult {
  const groups = new Map<string, NewsItem[]>();

  for (const item of items) {
    const key = item.originatingSource ?? headlineKey(item.headline);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const survivors: NewsItem[] = [];
  const collapsed: CorroborationResult["collapsed"] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      const only = group[0];
      if (only !== undefined) survivors.push(only);
      continue;
    }

    const independentSourceCount = new Set(group.map((i) => i.source)).size;
    const sorted = [...group].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const representative = sorted[0];
    if (representative === undefined) continue;

    // The representative is kept as-is; the true corroboration count for
    // this story is reported separately via `collapsed`, not written back
    // onto the NewsItem — NewsItem has no field for it, and inventing one
    // via a cast would silently lie to every other consumer of the type.
    survivors.push(representative);

    collapsed.push({
      representative: representative.id,
      collapsedIds: group.filter((i) => i.id !== representative.id).map((i) => i.id),
      independentSourceCount,
    });
  }

  return { items: survivors, collapsed };
}
