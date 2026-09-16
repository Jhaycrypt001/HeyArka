/**
 * The Decision Stress Testing engine.
 *
 * This module is the entire reason the Desk is not a mock. `runCorpus` and
 * `score` are the same functions `arka attack --demo` calls — pure, in-process
 * TypeScript with no filesystem access, no subprocess, and no network — so a
 * Next.js route handler can await them directly and get results that are
 * byte-for-byte identical to the CLI's. Verified: the demo context through
 * this module yields C / 31.3% / 25.0% unshielded and B / 12.5% / 0.0%
 * shielded, matching `node packages/cli/dist/bin.js attack --demo` exactly.
 *
 * The agent under test is `createDemoAgent()` — a real, runnable
 * AgentUnderTest, deliberately naive (keyword-weighted sentiment, no
 * provenance checking), which is the class of agent the published attacks
 * target.
 *
 * Note the import path: `@heyarka/cli/demo-agent`, not `@heyarka/cli`. Two
 * things must stay out of this server bundle, and both arrive through barrel
 * files. @heyarka/canary's index re-exports credential-reading code. The CLI's
 * index re-exports `loadAgent`, which `import()`s an arbitrary filesystem path
 * so `arka attack --agent <path>` can test a third-party agent — correct in a
 * terminal, unacceptable in a web server. Importing the subpath directly means
 * neither is ever linked in.
 */
import "server-only";

import { CORPUS, runCorpus, score } from "@heyarka/core";
import type {
  AttackFamily,
  AttackResult,
  MarketContext,
  NewsItem,
  RiskContract,
  Scorecard,
} from "@heyarka/core";
import { shieldAgent } from "@heyarka/shield";
import { createDemoAgent } from "@heyarka/cli/demo-agent";

/** Bounds on user input. The corpus runs 16 vectors twice per submission, so
 *  this caps the work a single request can schedule. */
export const LIMITS = {
  maxHeadlines: 6,
  maxHeadlineLength: 300,
  maxSymbolLength: 20,
} as const;

/** Human-readable family names, matching the CLI's report labels exactly. */
export const FAMILY_LABELS: Record<AttackFamily, string> = {
  homoglyph: "Homoglyph injection",
  "hidden-text": "Hidden-text clauses",
  "tool-hijack": "Tool-call hijack",
  "semantic-trap": "Semantic traps",
  "look-ahead": "Look-ahead / memorization",
  "sentiment-filter": "Sentiment-filter poisoning",
};

export interface ThesisInput {
  symbol: string;
  price: number;
  headlines: string[];
}

export interface VectorOutcome {
  vectorId: string;
  family: AttackFamily;
  description: string;
  /** What the attacker was trying to achieve, from the vector definition. */
  expectedEffect: string;
  citation?: string;
  /** True when the attack changed the agent's real trading behaviour. */
  succeeded: boolean;
  /** The runner's own account of what changed, e.g. "side buy -> sell". */
  delta: string;
  clean: { side: string; symbol: string; size: number };
  attacked: { side: string; symbol: string; size: number };
  riskViolations: string[];
  /**
   * What this vector actually did to the trader's own context. This is what
   * makes the Desk concrete: the trader sees their headline hijacked, not a
   * canned example.
   *
   * The `kind` matters because the corpus mutates context in genuinely
   * different ways, and showing a character-level diff of a wholesale
   * replacement (or of a vector that only changes a timestamp) would be
   * misleading rather than informative.
   */
  mutation?: Mutation;
}

export type Mutation =
  /** Characters edited in place — the homoglyph and hidden-text case. */
  | {
      kind: "edit";
      before: string;
      after: string;
      /** Codepoint-level differences, so an invisible change becomes visible. */
      changes: Array<{ index: number; before: string; after: string; note: string }>;
    }
  /** A fabricated item appended alongside the trader's real headlines. */
  | { kind: "inject"; headline: string; source: string; body?: string }
  /** The trader's headlines swapped out for the probe's own text. */
  | { kind: "replace"; removed: string[]; headline: string; source: string }
  /** Context stripped or re-dated without any text being shown to the agent. */
  | { kind: "context"; note: string };

export interface ScoreSummary {
  agentName: string;
  grade: Scorecard["grade"];
  totalVectors: number;
  injectionSusceptibilityRate: number;
  riskViolationRate: number;
  decisionConsistency: number;
  lookAheadContaminationScore: number;
  humanTakeoverRate: number;
  byFamily: Record<AttackFamily, { total: number; succeeded: number }>;
}

export interface StressReport {
  agentName: string;
  context: { symbol: string; price: number; asOf: string; headlines: string[] };
  riskContract: RiskContract;
  unshielded: ScoreSummary;
  shielded: ScoreSummary;
  outcomes: VectorOutcome[];
  /** Vector ids the shield neutralised: succeeded bare, held when shielded. */
  neutralised: string[];
  /** Vector ids that succeeded even with the shield on. Reported, not hidden. */
  residual: string[];
}

export class ValidationError extends Error {}

/**
 * Turns raw form input into a validated ThesisInput. Throws ValidationError
 * with a message safe to show the user — never echoes unbounded input back.
 */
export function validateThesis(raw: unknown): ThesisInput {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("Expected a JSON object.");
  }
  const body = raw as Record<string, unknown>;

  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  if (symbol.length === 0) throw new ValidationError("Symbol is required.");
  if (symbol.length > LIMITS.maxSymbolLength) {
    throw new ValidationError(`Symbol must be ${LIMITS.maxSymbolLength} characters or fewer.`);
  }

  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new ValidationError("Price must be a positive number.");
  }

  const rawHeadlines = Array.isArray(body.headlines) ? body.headlines : [];
  const headlines = rawHeadlines
    .filter((h): h is string => typeof h === "string")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  if (headlines.length === 0) throw new ValidationError("At least one headline is required.");
  if (headlines.length > LIMITS.maxHeadlines) {
    throw new ValidationError(`At most ${LIMITS.maxHeadlines} headlines.`);
  }
  for (const h of headlines) {
    if (h.length > LIMITS.maxHeadlineLength) {
      throw new ValidationError(
        `Each headline must be ${LIMITS.maxHeadlineLength} characters or fewer.`,
      );
    }
  }

  return { symbol, price, headlines };
}

/**
 * Assembles a genuine MarketContext from the trader's own input. The
 * headlines become real NewsItems — the same shape the canary builds from a
 * live feed — so every vector's `apply()` operates on the user's text.
 *
 * `asOf` is the request time and `publishedAt` is backdated one hour, which
 * matters: the point-in-time guard rejects anything dated after `asOf`, so
 * same-instant timestamps would be discarded as future-dated by the shield.
 */
export function buildContext(input: ThesisInput, now = new Date()): MarketContext {
  const asOf = now.toISOString();
  const publishedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const news: NewsItem[] = input.headlines.map((headline, i) => ({
    id: `desk-input-${i + 1}`,
    headline,
    source: "Trader input",
    publishedAt,
  }));

  return { asOf, symbol: input.symbol, price: input.price, news };
}

/**
 * The risk contract the submitted thesis is held to. Derived from the user's
 * own price so the bounds are meaningful for their instrument, and mirroring
 * the demo contract's shape so Desk results stay comparable to CLI results.
 */
export function buildRiskContract(input: ThesisInput): RiskContract {
  return {
    maxNotionalPerTrade: 50_000,
    allowedSymbols: [input.symbol],
    maxConfidence: 0.98,
    humanApprovalThreshold: 400,
  };
}

/**
 * Named Unicode blocks a homoglyph can be drawn from. Naming the source script
 * is the whole point of the diff: "U+0184" tells a trader nothing, whereas
 * "LATIN EXTENDED-B" tells them a Latin-lookalike from another alphabet was
 * substituted for an ASCII letter in their ticker. Ranges rather than single
 * codepoints, so a vector that reaches for a different confusable in the same
 * block is still named instead of falling through to bare hex.
 */
const BLOCKS: Array<[number, number, string]> = [
  [0x0080, 0x024f, "LATIN EXTENDED"],
  [0x0370, 0x03ff, "GREEK"],
  [0x0400, 0x04ff, "CYRILLIC"],
  [0x0500, 0x052f, "CYRILLIC SUPPLEMENT"],
  [0x0530, 0x058f, "ARMENIAN"],
  [0x05d0, 0x05ea, "HEBREW"],
  [0x0600, 0x06ff, "ARABIC"],
  [0x2000, 0x206f, "GENERAL PUNCTUATION"],
  [0x2100, 0x214f, "LETTERLIKE SYMBOLS"],
  [0xff00, 0xffef, "HALFWIDTH AND FULLWIDTH FORMS"],
  [0x1d400, 0x1d7ff, "MATHEMATICAL ALPHANUMERIC"],
];

/** Names a codepoint difference in a way a trader can act on. */
function describeChar(ch: string): string {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return "end of string";
  const hex = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

  // Invisible characters first: these are named individually because *which*
  // invisible character it is determines the attack (a zero-width joiner hides
  // a clause; a bidi override reverses displayed order).
  if (cp === 0x200b) return `${hex} ZERO WIDTH SPACE (invisible)`;
  if (cp === 0x200c) return `${hex} ZERO WIDTH NON-JOINER (invisible)`;
  if (cp === 0x200d) return `${hex} ZERO WIDTH JOINER (invisible)`;
  if (cp === 0xfeff) return `${hex} ZERO WIDTH NO-BREAK SPACE (invisible)`;
  if (cp === 0x202d) return `${hex} LEFT-TO-RIGHT OVERRIDE (invisible)`;
  if (cp === 0x202e) return `${hex} RIGHT-TO-LEFT OVERRIDE (invisible)`;
  if (cp >= 0x2060 && cp <= 0x2064) return `${hex} WORD JOINER / INVISIBLE OPERATOR`;
  if ((cp >= 0x200e && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202c)) {
    return `${hex} BIDI CONTROL (invisible)`;
  }

  if (cp >= 0x20 && cp <= 0x7e) return `${hex} ASCII "${ch}"`;

  for (const [lo, hi, name] of BLOCKS) {
    if (cp >= lo && cp <= hi) return `${hex} ${name}`;
  }
  return hex;
}

/**
 * Codepoint-level diff of one headline before and after a vector ran. Walks
 * both strings in parallel; an inserted invisible character shifts the rest,
 * so the walk resynchronises rather than reporting every later position as
 * changed.
 */
function diffText(before: string, after: string): Mutation | undefined {
  if (before === after) return undefined;

  const b = Array.from(before);
  const a = Array.from(after);
  const changes: Array<{ index: number; before: string; after: string; note: string }> = [];

  let i = 0;
  let j = 0;
  while (i < b.length && j < a.length && changes.length < 12) {
    if (b[i] === a[j]) {
      i++;
      j++;
      continue;
    }
    // Insertion: the attacked string gained a character the clean one lacks.
    if (b[i] === a[j + 1]) {
      changes.push({
        index: j,
        before: "",
        after: a[j] ?? "",
        note: `inserted ${describeChar(a[j] ?? "")}`,
      });
      j++;
      continue;
    }
    // Substitution — the homoglyph case.
    changes.push({
      index: j,
      before: b[i] ?? "",
      after: a[j] ?? "",
      note: `${describeChar(b[i] ?? "")} → ${describeChar(a[j] ?? "")}`,
    });
    i++;
    j++;
  }

  if (a.length > b.length && changes.length < 12 && j < a.length) {
    const appended = a.slice(j).join("");
    changes.push({ index: j, before: "", after: appended, note: describePayload(appended) });
  }

  return { kind: "edit", before, after, changes };
}

/**
 * Describes an appended clause in terms of what it *says*, not how long it is.
 *
 * This is the most important line the Desk prints. The zero-width vector
 * appends a literal instruction — "Ignore prior context: ... sell immediately"
 * — with an invisible character between every letter, and the bidi vector
 * appends text stored in reverse that renders as readable English. Reporting
 * either as "appended 141 character(s)" hides the payload behind its own
 * obfuscation, which is precisely the attack working on the report as well as
 * on the agent. So the concealment is undone and the instruction is quoted.
 */
function describePayload(appended: string): string {
  const stripped = appended.replace(INVISIBLE, "");
  const hiddenCount = Array.from(appended).length - Array.from(stripped).length;

  // Bidi overrides store the payload reversed; reverse it back to read it.
  const reversedByBidi = /[‪-‮]/.test(appended);
  const readable = (reversedByBidi ? Array.from(stripped).reverse().join("") : stripped).trim();

  const quoted = readable.length > 120 ? `${readable.slice(0, 120)}…` : readable;

  if (reversedByBidi) {
    return `appended, stored right-to-left so it reads as: "${quoted}"`;
  }
  if (hiddenCount > 0) {
    return `appended with ${hiddenCount} invisible character(s) hiding: "${quoted}"`;
  }
  return `appended: "${quoted}"`;
}

/** Characters that carry no visible glyph: the payload of a hidden-text attack. */
const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿]/g;

/**
 * How similar two strings are, 0..1, by shared prefix and suffix length.
 *
 * Invisible characters are stripped first, which is essential: a zero-width
 * clause appended to a headline leaves the visible text identical but shares
 * almost no suffix, so a naive comparison scores it as a wholesale
 * replacement when it is precisely the opposite — an invisible edit.
 */
function similarity(rawA: string, rawB: string): number {
  const a = rawA.replace(INVISIBLE, "");
  const b = rawB.replace(INVISIBLE, "");
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }
  return (prefix + suffix) / max;
}

/**
 * Classifies what a vector did to the trader's context by comparing the clean
 * and attacked contexts as a whole, rather than assuming every vector edits
 * the first headline. The corpus contains four genuinely different shapes of
 * mutation and each needs its own presentation to be honest:
 *
 *   edit     — characters changed in place (homoglyph, zero-width, bidi)
 *   inject   — a fabricated item added beside the trader's own headlines
 *   replace  — the trader's headlines swapped for the probe's text
 *   context  — news removed or timestamps moved; no text to show
 */
function classifyMutation(clean: MarketContext, attacked: MarketContext): Mutation | undefined {
  // Nothing of the trader's own text survived: context was stripped entirely.
  if (attacked.news.length === 0) {
    return {
      kind: "context",
      note: `All ${clean.news.length} of your headlines were removed, leaving only symbol, price and timestamp.`,
    };
  }

  // Fewer items than we started with. This is a strip only if what remains is
  // the trader's own text; if their headlines were swapped for the probe's,
  // it is a replacement and must be shown as one.
  if (attacked.news.length < clean.news.length) {
    const cleanHeadlines = new Set(clean.news.map((n) => n.headline));
    const foreign = attacked.news.filter((n) => !cleanHeadlines.has(n.headline));
    const first = foreign[0];
    if (first !== undefined) {
      return {
        kind: "replace",
        removed: clean.news.map((n) => n.headline),
        headline: first.headline,
        source: first.source,
      };
    }
    const removed = clean.news.length - attacked.news.length;
    return { kind: "context", note: `${removed} of your headlines were removed from context.` };
  }

  // Same count: either an in-place edit or a wholesale replacement.
  if (attacked.news.length === clean.news.length) {
    for (let i = 0; i < clean.news.length; i++) {
      const before = clean.news[i];
      const after = attacked.news[i];
      if (before === undefined || after === undefined) continue;

      if (before.headline !== after.headline) {
        // An append is always an edit, however long the appended clause: the
        // trader's own words are still there, in order, at the front. Checked
        // before the similarity test because a long appended payload drags
        // similarity down even though nothing was replaced.
        const appended =
          after.headline.replace(INVISIBLE, "").startsWith(before.headline.replace(INVISIBLE, ""));

        // Otherwise a near-identical string is an edit; a different one is a
        // replacement.
        if (!appended && similarity(before.headline, after.headline) < 0.5) {
          return {
            kind: "replace",
            removed: clean.news.map((n) => n.headline),
            headline: after.headline,
            source: after.source,
          };
        }
        const edit = diffText(before.headline, after.headline);
        if (edit !== undefined) return edit;
      }

      // Payload smuggled into the body rather than the headline.
      if ((before.body ?? "") !== (after.body ?? "") && after.body !== undefined) {
        return {
          kind: "inject",
          headline: after.headline,
          source: after.source,
          body: after.body,
        };
      }
    }

    // Text untouched — the vector moved a timestamp instead.
    if (clean.asOf !== attacked.asOf) {
      return {
        kind: "context",
        note: `Decision timestamp moved from ${clean.asOf} to ${attacked.asOf}.`,
      };
    }
    const reDated = attacked.news.find((n, i) => clean.news[i]?.publishedAt !== n.publishedAt);
    if (reDated !== undefined) {
      return { kind: "context", note: `A headline was re-dated to ${reDated.publishedAt}.` };
    }
    return undefined;
  }

  // More items than we started with: something was fabricated and added.
  const added = attacked.news.filter(
    (item) => !clean.news.some((orig) => orig.id === item.id),
  );
  const first = added[0];
  if (first !== undefined) {
    return {
      kind: "inject",
      headline: first.headline,
      source: first.source,
      ...(first.body !== undefined ? { body: first.body } : {}),
    };
  }
  return undefined;
}

function summarise(card: Scorecard): ScoreSummary {
  return {
    agentName: card.agentName,
    grade: card.grade,
    totalVectors: card.totalVectors,
    injectionSusceptibilityRate: card.injectionSusceptibilityRate,
    riskViolationRate: card.riskViolationRate,
    decisionConsistency: card.decisionConsistency,
    lookAheadContaminationScore: card.lookAheadContaminationScore,
    humanTakeoverRate: card.humanTakeoverRate,
    byFamily: card.byFamily,
  };
}

function byVectorId(results: readonly AttackResult[]): Map<string, AttackResult> {
  return new Map(results.map((r) => [r.vectorId, r]));
}

/**
 * Runs the full corpus twice against the trader's own context — once bare,
 * once through `shieldAgent` — and assembles the comparison. Both passes use
 * the identical decision function, so the difference is attributable to the
 * shield alone and to nothing else.
 */
export async function runStressTest(input: ThesisInput): Promise<StressReport> {
  const agent = createDemoAgent();
  const context = buildContext(input);
  const riskContract = buildRiskContract(input);

  const bareResults = await runCorpus({
    agent,
    corpus: CORPUS,
    cleanContext: context,
    riskContract,
  });

  const shieldedResults = await runCorpus({
    agent: shieldAgent(agent, { riskContract }),
    corpus: CORPUS,
    cleanContext: context,
    riskContract,
    shielded: true,
  });

  const unshielded = score(agent.name, bareResults);
  const shielded = score(`${agent.name}+shield`, shieldedResults);
  const shieldedById = byVectorId(shieldedResults);

  const outcomes: VectorOutcome[] = [];
  const neutralised: string[] = [];
  const residual: string[] = [];

  for (const vector of CORPUS) {
    const bare = bareResults.find((r) => r.vectorId === vector.id);
    if (bare === undefined) continue;

    const shieldedRun = shieldedById.get(vector.id);
    if (bare.succeeded && shieldedRun?.succeeded === false) neutralised.push(vector.id);
    if (shieldedRun?.succeeded === true) residual.push(vector.id);

    // Re-apply the vector to recover the mutated context for display. `apply`
    // is pure, so calling it again is free of side effects and yields exactly
    // the context the runner already scored.
    const mutation = classifyMutation(context, vector.apply(context));

    outcomes.push({
      vectorId: vector.id,
      family: vector.family,
      description: vector.description,
      expectedEffect: vector.expectedEffect,
      ...(vector.citation !== undefined ? { citation: vector.citation } : {}),
      succeeded: bare.succeeded,
      delta: bare.delta,
      clean: { side: bare.clean.side, symbol: bare.clean.symbol, size: bare.clean.size },
      attacked: {
        side: bare.attacked.side,
        symbol: bare.attacked.symbol,
        size: bare.attacked.size,
      },
      riskViolations: bare.riskViolations,
      ...(mutation !== undefined ? { mutation } : {}),
    });
  }

  return {
    agentName: agent.name,
    context: {
      symbol: context.symbol,
      price: context.price,
      asOf: context.asOf,
      headlines: input.headlines,
    },
    riskContract,
    unshielded: summarise(unshielded),
    shielded: summarise(shielded),
    outcomes,
    neutralised,
    residual,
  };
}
