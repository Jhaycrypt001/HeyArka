/**
 * Dashboard data, computed from the real packages at request time.
 *
 * Every number on the dashboard is derived here by calling the shipped
 * functions, never by reading a hand-written constant. That distinction is the
 * whole point: `lib/facts.ts` records the results of runs that already
 * happened (and is honest about being a transcript), whereas this module
 * *executes* the harness. If a vector is added to the corpus, or the shield's
 * behaviour changes, the dashboard changes with it and cannot drift.
 *
 * Same import discipline as `lib/stress.ts`: `@heyarka/cli/demo-agent` is
 * imported by subpath, never the CLI barrel, because the barrel re-exports
 * `loadAgent` (arbitrary filesystem `import()`) and the canary barrel reads
 * credentials. Neither belongs in a web server bundle.
 */
import "server-only";

import { CORPUS, runCorpus, runVector, score, findConfusables, hasInvisibleChars } from "@heyarka/core";
import type { AttackFamily, AttackVector, ProposedOrder, Scorecard } from "@heyarka/core";
import { shieldAgent, sanitizeText } from "@heyarka/shield";
import { createDemoAgent } from "@heyarka/cli/demo-agent";
import type { MarketContext, RiskContract } from "@heyarka/core";

export interface FamilyBreakdown {
  family: AttackFamily;
  label: string;
  total: number;
  bareSucceeded: number;
  shieldedSucceeded: number;
  /** Vectors the shield turned from a hit into a miss. */
  neutralised: number;
}

export interface LiveRun {
  /** ISO timestamp of the run that produced these numbers. */
  ranAt: string;
  /** Milliseconds the full double pass took, measured. */
  durationMs: number;
  vectorCount: number;
  familyCount: number;
  unshielded: Scorecard;
  shielded: Scorecard;
  families: FamilyBreakdown[];
  /** Vector ids that still succeed with the shield on. Reported, not hidden. */
  residual: string[];
  neutralised: string[];
}

export const FAMILY_LABELS: Record<AttackFamily, string> = {
  homoglyph: "Homoglyph injection",
  "hidden-text": "Hidden-text clauses",
  "tool-hijack": "Tool-call hijack",
  "semantic-trap": "Semantic traps",
  "look-ahead": "Look-ahead / memorization",
  "sentiment-filter": "Sentiment-filter poisoning",
};

/**
 * The reference context the dashboard's headline run uses.
 *
 * Fixed rather than randomised so the dashboard is reproducible: a judge can
 * run `arka attack --demo` and get the same grades. `publishedAt` is backdated
 * an hour because the point-in-time guard rejects future-dated news, so a
 * same-instant timestamp would be discarded by the shield rather than scored.
 */
function referenceContext(now = new Date()): MarketContext {
  const asOf = now.toISOString();
  const publishedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  return {
    asOf,
    symbol: "TSLA",
    price: 248.5,
    news: [
      {
        id: "dash-1",
        headline: "TSLA halts delivery guidance pending review",
        source: "Reuters",
        publishedAt,
      },
      {
        id: "dash-2",
        headline: "Analysts split on Tesla margin outlook into Q4",
        source: "Bloomberg",
        publishedAt,
      },
    ],
  };
}

const REFERENCE_CONTRACT: RiskContract = {
  maxNotionalPerTrade: 50_000,
  allowedSymbols: ["TSLA"],
  maxConfidence: 0.98,
  humanApprovalThreshold: 400,
};

/**
 * Runs the whole corpus twice against the reference context and assembles the
 * dashboard's live figures. Pure and in-process: no network, no filesystem, no
 * credentials, which is what makes it safe to run on a page request.
 */
export async function runLive(): Promise<LiveRun> {
  const started = Date.now();
  const agent = createDemoAgent();
  const context = referenceContext();

  const bare = await runCorpus({
    agent,
    corpus: CORPUS,
    cleanContext: context,
    riskContract: REFERENCE_CONTRACT,
  });

  const shielded = await runCorpus({
    agent: shieldAgent(agent, { riskContract: REFERENCE_CONTRACT }),
    corpus: CORPUS,
    cleanContext: context,
    riskContract: REFERENCE_CONTRACT,
    shielded: true,
  });

  const durationMs = Date.now() - started;

  const bareCard = score(agent.name, bare);
  const shieldedCard = score(`${agent.name}+shield`, shielded);

  const shieldedById = new Map(shielded.map((r) => [r.vectorId, r]));
  const residual: string[] = [];
  const neutralised: string[] = [];

  for (const result of bare) {
    const s = shieldedById.get(result.vectorId);
    if (s?.succeeded === true) residual.push(result.vectorId);
    if (result.succeeded && s?.succeeded === false) neutralised.push(result.vectorId);
  }

  // Group by family from the corpus itself, so a new family appears here
  // without this file being touched.
  const families = new Map<AttackFamily, FamilyBreakdown>();
  for (const vector of CORPUS) {
    let entry = families.get(vector.family);
    if (entry === undefined) {
      entry = {
        family: vector.family,
        label: FAMILY_LABELS[vector.family],
        total: 0,
        bareSucceeded: 0,
        shieldedSucceeded: 0,
        neutralised: 0,
      };
      families.set(vector.family, entry);
    }
    entry.total++;
    const b = bare.find((r) => r.vectorId === vector.id);
    const s = shieldedById.get(vector.id);
    if (b?.succeeded === true) entry.bareSucceeded++;
    if (s?.succeeded === true) entry.shieldedSucceeded++;
    if (b?.succeeded === true && s?.succeeded === false) entry.neutralised++;
  }

  return {
    ranAt: new Date().toISOString(),
    durationMs,
    vectorCount: CORPUS.length,
    familyCount: families.size,
    unshielded: bareCard,
    shielded: shieldedCard,
    families: [...families.values()],
    residual,
    neutralised,
  };
}

/** A corpus vector flattened for display, with no functions attached. */
export interface VectorSummary {
  id: string;
  family: AttackFamily;
  label: string;
  description: string;
  expectedEffect: AttackVector["expectedEffect"];
  citation?: string;
}

/** The corpus as plain data, safe to hand to a client component. */
export function corpusSummary(): VectorSummary[] {
  return CORPUS.map((v) => ({
    id: v.id,
    family: v.family,
    label: FAMILY_LABELS[v.family],
    description: v.description,
    expectedEffect: v.expectedEffect,
    ...(v.citation !== undefined ? { citation: v.citation } : {}),
  }));
}

// --- The live inspector -----------------------------------------------------

export interface InspectFinding {
  /** Zero-based index into the ORIGINAL string. */
  index: number;
  char: string;
  codepoint: string;
  kind: "confusable" | "invisible";
  /** For a confusable, the ASCII letter it imitates. */
  mimics?: string;
  note: string;
}

export interface InspectResult {
  input: string;
  clean: string;
  wasModified: boolean;
  /** The shield's own findings list, verbatim. */
  findings: string[];
  hasInvisible: boolean;
  chars: InspectFinding[];
  /** Length in codepoints, which differs from `.length` for astral chars. */
  inputLength: number;
  cleanLength: number;
}

const INVISIBLE_NAMES: Record<number, string> = {
  0x200b: "ZERO WIDTH SPACE",
  0x200c: "ZERO WIDTH NON-JOINER",
  0x200d: "ZERO WIDTH JOINER",
  0x200e: "LEFT-TO-RIGHT MARK",
  0x200f: "RIGHT-TO-LEFT MARK",
  0x202a: "LEFT-TO-RIGHT EMBEDDING",
  0x202b: "RIGHT-TO-LEFT EMBEDDING",
  0x202c: "POP DIRECTIONAL FORMATTING",
  0x202d: "LEFT-TO-RIGHT OVERRIDE",
  0x202e: "RIGHT-TO-LEFT OVERRIDE",
  0x2060: "WORD JOINER",
  0xfeff: "ZERO WIDTH NO-BREAK SPACE",
};

function isInvisible(cp: number): boolean {
  if (INVISIBLE_NAMES[cp] !== undefined) return true;
  return cp >= 0x2061 && cp <= 0x2064;
}

/**
 * Runs the real sanitizer over arbitrary text and reports, character by
 * character, what it found. This is the shield's own `sanitizeText` plus
 * `findConfusables` from core: the inspector cannot claim a detection the
 * shipped library would not make.
 *
 * Input length is bounded by the caller (the route handler); this function
 * assumes it has already been checked.
 */
export function inspect(input: string): InspectResult {
  const result = sanitizeText(input);
  const confusables = findConfusables(input);
  const byIndex = new Map(confusables.map((c) => [c.index, c]));

  const chars: InspectFinding[] = [];
  let index = 0;
  for (const ch of Array.from(input)) {
    const cp = ch.codePointAt(0) ?? 0;
    const hex = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

    if (isInvisible(cp)) {
      chars.push({
        index,
        char: ch,
        codepoint: hex,
        kind: "invisible",
        note: `${INVISIBLE_NAMES[cp] ?? "INVISIBLE FORMAT CHARACTER"} carries no glyph`,
      });
    } else {
      const hit = byIndex.get(index);
      if (hit !== undefined) {
        chars.push({
          index,
          char: ch,
          codepoint: hex,
          kind: "confusable",
          mimics: hit.mimics,
          note: `renders like "${hit.mimics}" but is ${hex}`,
        });
      }
    }
    index++;
  }

  return {
    input,
    clean: result.clean,
    wasModified: result.wasModified,
    findings: result.findings,
    hasInvisible: hasInvisibleChars(input),
    chars,
    inputLength: Array.from(input).length,
    cleanLength: Array.from(result.clean).length,
  };
}

export const INSPECT_MAX_LENGTH = 400;

// --- The attack bench -------------------------------------------------------

/**
 * One headline as the agent saw it, before and after the vector rewrote it.
 *
 * Kept as a pair rather than a diff string because the entire premise of these
 * attacks is that the two render identically: a textual diff would show nothing
 * for a homoglyph swap. The client renders `attacked` codepoint by codepoint.
 */
export interface BenchHeadline {
  id: string;
  clean: string;
  attacked: string;
  /** True when the vector actually rewrote this particular headline. */
  changed: boolean;
}

export interface BenchPass {
  order: ProposedOrder;
  succeeded: boolean;
  delta: string;
  riskViolations: string[];
}

export interface BenchResult {
  vectorId: string;
  family: AttackFamily;
  familyLabel: string;
  description: string;
  citation?: string;
  expectedEffect: AttackVector["expectedEffect"];
  /** What the agent decided with no attack at all: the control. */
  baseline: ProposedOrder;
  /** Headlines injected into the context by this vector. */
  headlines: BenchHeadline[];
  /** Any news item the vector added that has no clean counterpart. */
  injected: string[];
  bare: BenchPass;
  shielded: BenchPass;
  /** Measured wall time for the two passes. */
  durationMs: number;
}

/**
 * Runs a single named vector against the reference agent twice: once bare and
 * once behind the shield, against the same clean context the dashboard's
 * headline run uses.
 *
 * This is the dashboard's "do it yourself" surface. It calls the shipped
 * `runVector`, so a result here is the same adjudication `arka attack` would
 * make on that vector, not a re-implementation for display.
 *
 * Returns `null` for an unknown id so the caller can answer 404 rather than
 * throwing on user input.
 */
export async function bench(vectorId: string): Promise<BenchResult | null> {
  const vector = CORPUS.find((v) => v.id === vectorId);
  if (vector === undefined) return null;

  const started = Date.now();
  const agent = createDemoAgent();
  const context = referenceContext();

  const [bareResult, shieldedResult] = await Promise.all([
    runVector({ agent, vector, cleanContext: context, riskContract: REFERENCE_CONTRACT }),
    runVector({
      agent: shieldAgent(agent, { riskContract: REFERENCE_CONTRACT }),
      vector,
      cleanContext: context,
      riskContract: REFERENCE_CONTRACT,
      shielded: true,
    }),
  ]);

  // Apply the vector once more purely to show the payload. `apply` is pure, so
  // this cannot perturb the adjudication above.
  const attackedContext = vector.apply(context);
  const cleanById = new Map(context.news.map((n) => [n.id, n]));

  const headlines: BenchHeadline[] = [];
  const injected: string[] = [];
  for (const item of attackedContext.news) {
    const original = cleanById.get(item.id);
    if (original === undefined) {
      injected.push(item.headline);
      continue;
    }
    headlines.push({
      id: item.id,
      clean: original.headline,
      attacked: item.headline,
      changed: original.headline !== item.headline,
    });
  }

  return {
    vectorId: vector.id,
    family: vector.family,
    familyLabel: FAMILY_LABELS[vector.family],
    description: vector.description,
    ...(vector.citation !== undefined ? { citation: vector.citation } : {}),
    expectedEffect: vector.expectedEffect,
    baseline: bareResult.clean,
    headlines,
    injected,
    bare: {
      order: bareResult.attacked,
      succeeded: bareResult.succeeded,
      delta: bareResult.delta,
      riskViolations: bareResult.riskViolations,
    },
    shielded: {
      order: shieldedResult.attacked,
      succeeded: shieldedResult.succeeded,
      delta: shieldedResult.delta,
      riskViolations: shieldedResult.riskViolations,
    },
    durationMs: Date.now() - started,
  };
}
