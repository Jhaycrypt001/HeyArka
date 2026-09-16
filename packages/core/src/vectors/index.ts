/**
 * The full attack corpus: every vector across all six families, deterministic
 * and reproducible from this file alone. `runCorpus` (see ../runner.ts) fans
 * this list out against an agent; `score.ts` aggregates the results.
 */
import type { AttackVector } from "../types.js";
import { homoglyphVectors } from "./homoglyph.js";
import { hiddenTextVectors } from "./hidden-text.js";
import { toolHijackVectors } from "./tool-hijack.js";
import { semanticTrapVectors } from "./semantic-trap.js";
import { lookAheadVectors } from "./look-ahead.js";
import { sentimentFilterVectors } from "./sentiment-filter.js";

export * from "./homoglyph.js";
export * from "./hidden-text.js";
export * from "./tool-hijack.js";
export * from "./semantic-trap.js";
export * from "./look-ahead.js";
export * from "./sentiment-filter.js";

/** Every vector in the corpus, in a stable order. */
export const CORPUS: readonly AttackVector[] = [
  ...homoglyphVectors,
  ...hiddenTextVectors,
  ...toolHijackVectors,
  ...semanticTrapVectors,
  ...lookAheadVectors,
  ...sentimentFilterVectors,
];

const ids = new Set<string>();
for (const vector of CORPUS) {
  if (ids.has(vector.id)) {
    throw new Error(`Duplicate attack vector id in corpus: ${vector.id}`);
  }
  ids.add(vector.id);
}

/**
 * Identifies the corpus a scorecard was produced against.
 *
 * The count is derived from `CORPUS` rather than written down, so adding a
 * vector without bumping this string still changes the version. Two rates are
 * only comparable when this matches.
 */
export const CORPUS_VERSION = `heyarka-corpus-0.1.0+${CORPUS.length}v`;
