/**
 * Text sanitizer: the first shield layer, run on every piece of news text
 * before it reaches an agent's context. Defeats the character-level trick in
 * `homoglyph` and `hidden-text` attacks — the payload can no longer hide from
 * a downstream reader — using the same `CONFUSABLES`/`INVISIBLE_CHARS`/
 * `BIDI_CHARS` tables the corresponding attack vectors are built from; see
 * unicode.ts in @heyarka/core for why that sharing is load-bearing.
 *
 * Important limit, measured rather than assumed: decoding a hidden-text
 * payload makes it *legible*, not *false*. A hidden clause that says "sell
 * immediately" decodes to real, readable bearish language once unmasked —
 * sanitizing it does not make an agent that trusts embedded sentiment any
 * less willing to act on it. Sanitization defeats the obfuscation; it is the
 * risk contract (deterministic, never reads prose) and the provenance gate
 * that must defeat the content itself.
 * `shield.test.ts` documents this tradeoff with a real before/after run.
 *
 * That provenance layer now exists — `provenance.ts` — and it was built
 * because this limit turned out to be worse than "insufficient" on one
 * vector. Repairing a fabricated headline's Cyrillic ticker hands the agent a
 * clean, credible story about the symbol it trades, so the fold made the
 * forgery stronger. The findings this module reports are therefore evidence,
 * not just audit decoration: the gate reads them and withholds items whose
 * letters were rewritten. Note the division of labour — this module still
 * repairs everything it can, because the gate needs the repaired text to
 * compare against, and because legibility is the right default for every
 * item that is not withheld.
 */
import { skeleton, hasInvisibleChars, stripInvisible } from "@heyarka/core";
import type { NewsItem } from "@heyarka/core";

export interface SanitizeResult {
  /** The cleaned text: invisible/bidi characters removed, confusables folded. */
  clean: string;
  /** True if the input contained anything the sanitizer had to remove or fold. */
  wasModified: boolean;
  /** Human-readable list of what was found, for the audit trail. */
  findings: string[];
}

/**
 * Strips zero-width and bidi control characters, then folds any confusable
 * character to its Latin lookalike and NFKC-normalizes. Order matters:
 * invisible characters must be stripped first, or they would survive inside
 * runs the skeleton pass treats as opaque.
 */
export function sanitizeText(raw: string): SanitizeResult {
  const findings: string[] = [];

  const hadInvisible = hasInvisibleChars(raw);
  if (hadInvisible) findings.push("removed zero-width or bidi control characters");
  const withoutInvisible = stripInvisible(raw);

  const folded = skeleton(withoutInvisible);
  if (folded !== withoutInvisible) findings.push("folded confusable characters to their Latin form");

  return {
    clean: folded,
    wasModified: hadInvisible || folded !== withoutInvisible,
    findings,
  };
}

/** Applies `sanitizeText` to a NewsItem's headline and body. Other fields pass through untouched. */
export function sanitizeNewsItem(item: NewsItem): { item: NewsItem; result: SanitizeResult } {
  const headlineResult = sanitizeText(item.headline);
  const bodyResult = item.body !== undefined ? sanitizeText(item.body) : undefined;

  const findings = [
    ...headlineResult.findings.map((f) => `headline: ${f}`),
    ...(bodyResult?.findings.map((f) => `body: ${f}`) ?? []),
  ];

  return {
    item: {
      ...item,
      headline: headlineResult.clean,
      ...(item.body !== undefined ? { body: bodyResult?.clean ?? item.body } : {}),
    },
    result: {
      clean: headlineResult.clean,
      wasModified: headlineResult.wasModified || (bodyResult?.wasModified ?? false),
      findings,
    },
  };
}
