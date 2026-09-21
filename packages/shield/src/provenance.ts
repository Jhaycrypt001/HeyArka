/**
 * Provenance gate: withholds news text whose ENCODING was manipulated.
 *
 * WHY THIS EXISTS. The sanitizer detects a homoglyph attack and then repairs
 * it, and until this module the detection was discarded — the repaired text
 * went to the agent indistinguishable from text that had always been clean.
 * For the `homoglyph-phantom-symbol` vector that is worse than doing nothing:
 * the attack injects a fabricated headline whose ticker is spelled in
 * Cyrillic, the sanitizer faithfully folds it back to the real symbol, and
 * the agent is handed a clean, credible headline about the instrument it
 * trades. Normalization removed the one cue that might have made a careful
 * reader discount the story.
 *
 * Measured, not assumed: against a live model this produced a flat-to-long
 * position on both the bare and the shielded arm (2026-09-20,
 * nex-agi/nex-n2.5-pro, hold/0 -> buy/400 in both). The shield's own audit
 * trail recorded that it had folded confusables on that item, and nothing
 * acted on the record.
 *
 * THE RULE. Text whose letters were rewritten to hide their identity is not
 * evidence. An item carrying that signature is quarantined — withheld from
 * the agent — unless an independent, untampered source reports the same
 * story, in which case the story stands on the clean copy.
 *
 * WHAT IS DELIBERATELY NOT A SIGNAL. This gate is only deployable if it does
 * not fire on real feeds, so the definition of "tampered" is narrow, and each
 * exclusion below was added because real data tripped the naive version:
 *
 *   - Whitespace folding. U+00A0 NO-BREAK SPACE folds to a plain space, and
 *     publishers use it constantly. Measured on the live Cointelegraph feed
 *     the canary reads: 1 of 32 headlines contained one. Counting that as
 *     tampering would quarantine real news, so only changes to LETTERS and
 *     DIGITS count.
 *   - Emoji joiners. U+200D sits between pictographs in ordinary emoji
 *     sequences. Only invisible characters adjacent to a letter or digit —
 *     the shape used to hide a payload inside a word — count.
 */
import { INVISIBLE_CHARS, BIDI_CHARS, skeleton } from "@heyarka/core";
import type { NewsItem } from "@heyarka/core";

/** One reason an item's text is considered encoding-manipulated. */
export interface TamperFinding {
  field: "headline" | "body";
  kind: "confusable-letter" | "hidden-character";
  detail: string;
}

const INVISIBLE_SET = new Set<string>([...INVISIBLE_CHARS, ...BIDI_CHARS]);
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

function isLetterOrDigit(ch: string | undefined): boolean {
  return ch !== undefined && LETTER_OR_DIGIT.test(ch);
}

/**
 * Finds invisible characters positioned inside a word.
 *
 * Adjacency to a letter or digit is what separates a hidden-text payload
 * ("TSLA<ZWSP>surges") from an emoji joiner, which sits between pictographs.
 */
function findHiddenCharacters(raw: string): string[] {
  const chars = [...raw];
  const found = new Set<string>();

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (!INVISIBLE_SET.has(ch)) continue;

    const before = chars[i - 1];
    const after = chars[i + 1];
    if (isLetterOrDigit(before) || isLetterOrDigit(after)) {
      found.add(`U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }

  return [...found];
}

/**
 * Finds letters or digits that fold to a different character.
 *
 * Compared position by position against the confusables skeleton, and only
 * where the ORIGINAL character is a letter or digit. A Cyrillic Т folding to
 * a Latin T is a rewritten letter; U+00A0 folding to a space is not.
 *
 * Invisible characters are NOT stripped first here, deliberately: this pass
 * asks only whether visible letters were substituted, and stripping would
 * shift every index after the removal and produce spurious mismatches.
 */
function findConfusableLetters(raw: string): string[] {
  const folded = skeleton(raw);
  if (folded === raw) return [];

  const rawChars = [...raw];
  const foldedChars = [...folded];
  const found = new Set<string>();

  // A fold can change length (one confusable may expand to several Latin
  // characters), which makes strict index alignment unsafe past the first
  // difference. Scanning only up to the shorter length, and reporting the
  // originals that are letters or digits, is enough to answer the yes/no
  // question this gate asks without claiming a precise character map.
  const limit = Math.min(rawChars.length, foldedChars.length);
  for (let i = 0; i < limit; i++) {
    const original = rawChars[i]!;
    if (original === foldedChars[i]) continue;
    if (!isLetterOrDigit(original)) continue;
    found.add(
      `U+${original.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} -> ${foldedChars[i]}`,
    );
  }

  // Length changed and every aligned position matched: a confusable expanded.
  // That is still a letter substitution, so it must not be reported as clean.
  if (found.size === 0 && rawChars.length !== foldedChars.length) {
    found.add("confusable expansion changed the character count");
  }

  return [...found];
}

/** Reports every attack-shaped encoding change in one field's text. */
export function detectTamperingInText(
  raw: string,
  field: TamperFinding["field"],
): TamperFinding[] {
  const findings: TamperFinding[] = [];

  const hidden = findHiddenCharacters(raw);
  if (hidden.length > 0) {
    findings.push({
      field,
      kind: "hidden-character",
      detail: `invisible character inside a word: ${hidden.join(", ")}`,
    });
  }

  const confusables = findConfusableLetters(raw);
  if (confusables.length > 0) {
    findings.push({
      field,
      kind: "confusable-letter",
      detail: `letters rewritten to lookalikes: ${confusables.slice(0, 4).join(", ")}`,
    });
  }

  return findings;
}

/**
 * Reports tampering across a whole item.
 *
 * Takes the ORIGINAL item, before sanitization — the evidence only exists in
 * the unrepaired text.
 */
export function detectTampering(item: NewsItem): TamperFinding[] {
  return [
    ...detectTamperingInText(item.headline, "headline"),
    ...(item.body !== undefined ? detectTamperingInText(item.body, "body") : []),
  ];
}

/** Loose key used to decide whether two items are telling the same story. */
function storyKey(item: NewsItem): string {
  return (
    item.originatingSource ??
    item.headline
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export interface ProvenanceEntry {
  /** The sanitized item, as it would reach the agent. */
  item: NewsItem;
  /** Findings from the ORIGINAL, pre-sanitization text. */
  findings: TamperFinding[];
}

export interface QuarantinedItem {
  id: string;
  source: string;
  findings: TamperFinding[];
  /**
   * True when an untampered item reports the same story, so dropping this
   * copy cost the agent no information. False means the story is gone from
   * the context entirely — still the right call, but a materially stronger
   * intervention, and the audit trail should not blur the two.
   */
  storySurvivesElsewhere: boolean;
}

export interface ProvenanceResult {
  /** Items the agent is allowed to see. */
  items: NewsItem[];
  quarantined: QuarantinedItem[];
}

/**
 * Drops every encoding-manipulated item and reports what was dropped.
 *
 * A tampered item is always withheld — text whose letters were rewritten to
 * hide their identity is not evidence, regardless of what else is in the
 * feed. What the corroboration check changes is the severity recorded in the
 * audit, not the decision: when a clean copy of the same story is present the
 * agent loses nothing, and when it is not, the gate has removed the only
 * account of that story and says so.
 */
export function applyProvenanceGate(
  entries: readonly ProvenanceEntry[],
): ProvenanceResult {
  const cleanStoryKeys = new Set(
    entries.filter((e) => e.findings.length === 0).map((e) => storyKey(e.item)),
  );

  const items: NewsItem[] = [];
  const quarantined: QuarantinedItem[] = [];

  for (const entry of entries) {
    if (entry.findings.length === 0) {
      items.push(entry.item);
      continue;
    }

    quarantined.push({
      id: entry.item.id,
      source: entry.item.source,
      findings: entry.findings,
      storySurvivesElsewhere: cleanStoryKeys.has(storyKey(entry.item)),
    });
  }

  return { items, quarantined };
}
