/**
 * Every figure rendered on the landing page comes from this file, and every
 * figure in this file was produced by actually running the tool — not
 * estimated, not rounded for effect, not aspirational.
 *
 * Re-verify with:
 *   pnpm build && node packages/cli/dist/bin.js attack --demo
 *   node packages/cli/dist/bin.js attack --demo --shielded
 *   pnpm -r test
 *
 * Last verified: 2026-09-15 (see LANDING-SPEC.md §13).
 */

export interface FamilyResult {
  readonly label: string;
  readonly succeeded: number;
  readonly total: number;
}

export interface Scorecard {
  readonly agentName: string;
  readonly grade: string;
  readonly vectorsRun: number;
  readonly injectionSusceptibility: string;
  readonly riskViolation: string;
  readonly decisionConsistency: string;
  readonly lookAheadContamination: string;
  readonly humanTakeover: string;
  readonly families: readonly FamilyResult[];
}

/** `arka attack --demo` */
export const UNSHIELDED: Scorecard = {
  agentName: "heyarka-demo-agent",
  grade: "C",
  vectorsRun: 16,
  injectionSusceptibility: "31.3%",
  riskViolation: "25.0%",
  decisionConsistency: "100.0%",
  lookAheadContamination: "0.0%",
  humanTakeover: "0.0%",
  families: [
    { label: "Homoglyph injection", succeeded: 1, total: 2 },
    { label: "Hidden-text clauses", succeeded: 0, total: 3 },
    { label: "Tool-call hijack", succeeded: 2, total: 3 },
    { label: "Semantic traps", succeeded: 1, total: 3 },
    { label: "Look-ahead / memorization", succeeded: 0, total: 3 },
    { label: "Sentiment-filter poisoning", succeeded: 1, total: 2 },
  ],
};

/** `arka attack --demo --shielded` */
export const SHIELDED: Scorecard = {
  agentName: "heyarka-demo-agent+shield",
  grade: "B",
  vectorsRun: 16,
  injectionSusceptibility: "12.5%",
  riskViolation: "0.0%",
  decisionConsistency: "100.0%",
  lookAheadContamination: "0.0%",
  humanTakeover: "66.7%",
  families: [
    { label: "Homoglyph injection", succeeded: 0, total: 2 },
    { label: "Hidden-text clauses", succeeded: 0, total: 3 },
    { label: "Tool-call hijack", succeeded: 0, total: 3 },
    { label: "Semantic traps", succeeded: 1, total: 3 },
    { label: "Look-ahead / memorization", succeeded: 0, total: 3 },
    { label: "Sentiment-filter poisoning", succeeded: 1, total: 2 },
  ],
};

export const CORPUS = {
  vectorCount: 16,
  familyCount: 6,
  families: [
    { id: "homoglyph", label: "Homoglyph injection", count: 2 },
    { id: "hidden-text", label: "Hidden-text clauses", count: 3 },
    { id: "tool-hijack", label: "Tool-call hijack", count: 3 },
    { id: "semantic-trap", label: "Semantic traps", count: 3 },
    { id: "look-ahead", label: "Look-ahead / memorization", count: 3 },
    { id: "sentiment-filter", label: "Sentiment-filter poisoning", count: 2 },
  ],
} as const;

export const TESTS = {
  total: 125,
  byPackage: [
    { name: "@heyarka/core", count: 42 },
    { name: "@heyarka/shield", count: 24 },
    { name: "@heyarka/cli", count: 29 },
    { name: "@heyarka/canary", count: 22 },
    { name: "@heyarka/mcp", count: 8 },
  ],
} as const;

/**
 * The live repo-agent proof: HeyArka cloning a genuinely separate git repo
 * and attacking the agent inside it.
 */
export const REPO_RUN = {
  grade: "B",
  injectionSusceptibility: "18.8%",
} as const;

export const PAPERS = [
  {
    id: "arXiv:2601.13082",
    title: "Adversarial News and Lost Profits",
    note: "Documented the attack. Proposed no defense.",
  },
  {
    id: "arXiv:2601.13770",
    title: "Look-Ahead-Bench",
    note: "Backtest profit from memorization, not prediction.",
  },
] as const;

/**
 * The canary A/B is live, but control and shielded have agreed on every real
 * tick so far — no adversarial headline has organically appeared in the feed
 * during the run. There is therefore NO PnL delta to display, and the page
 * must not imply one. This string is the honest statement of that.
 */
export const CANARY = {
  cadence: "every 15 minutes",
  account: "Bitget Demo (paper) only, never live funds",
  divergence:
    "Control and shielded have agreed on every tick so far. No attributable PnL delta exists yet, so none is claimed.",
} as const;
