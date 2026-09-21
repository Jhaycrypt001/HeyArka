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

/**
 * The public repository. Defined once because it is linked from the navbar, the
 * footer nav and the footer's social row; four hand-written copies is how three
 * of them ended up pointing at a bare `https://github.com` that resolved to the
 * site's own homepage rather than to this project.
 */
export const REPO_URL = "https://github.com/Jhaycrypt001/HeyArka";

/**
 * The project's X account. Defined here for the same reason as `REPO_URL`: the
 * footer's social row carried a bare `https://x.com`, which is X's own home
 * page and not this project — the identical fault the comment above records.
 */
export const X_URL = "https://x.com/jhayycrypt";

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
  /**
   * Fell from 66.7% when the provenance gate shipped. Fewer orders now reach
   * the risk contract needing escalation, because an encoding-manipulated
   * headline is withheld before the agent ever reads it — the attack is
   * stopped earlier in the pipeline rather than vetoed at the end of it.
   */
  humanTakeover: "50.0%",
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
  total: 192,
  byPackage: [
    { name: "@heyarka/core", count: 53 },
    { name: "@heyarka/shield", count: 43 },
    { name: "@heyarka/llm-agent", count: 34 },
    { name: "@heyarka/cli", count: 29 },
    { name: "@heyarka/canary", count: 25 },
    { name: "@heyarka/mcp", count: 8 },
  ],
} as const;

/**
 * The live repo-agent proof: HeyArka cloning a genuinely separate git repo via
 * `arka attack --repo <url> --entry <path>` and attacking the agent inside it,
 * with none of HeyArka's code in that repo.
 *
 * What is claimed here is the CAPABILITY, not a specific rate. A susceptibility
 * rate is a property of the agent under test, so quoting one number for "a
 * cloned repo" would be meaningless out of context and unreproducible by a
 * reader who does not have that exact agent. The figure below is from a
 * keyword-sentiment agent of the shape most RSS-reading submissions use, and it
 * is labelled as such rather than presented as a universal result.
 *
 * Re-verify: init any repo exporting { name, decide }, then
 *   arka attack --repo <path-or-url> --entry agent.mjs
 *
 * Last verified: 2026-09-16.
 */
export const REPO_RUN = {
  grade: "B",
  injectionSusceptibility: "12.5%",
  subject: "a keyword-sentiment agent in a separate git repo",
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
 * The live canary.
 *
 * What this experiment claims, precisely: it is a **controlled A/B under
 * identical conditions**, not a profit result. Two Bitget Demo accounts, the
 * same symbol, the same live Cointelegraph feed, the same agent logic, ticking
 * together; the only difference between them is `@heyarka/shield`.
 *
 * Two symbols run as two SEPARATE experiments, each with its own log
 * (reports/canary.jsonl, reports/canary-eth.jsonl), because the risk contract
 * binds to the launch symbol and pooling them would average two experiments
 * into a number describing neither. The figures below are the BTCUSDT run, the
 * longer of the two; ETHUSDT started later and is reported on its own.
 *
 * The quantitative finding is the AGREEMENT RATE, and it is a real finding in
 * both directions. Every tick where control and shielded agree is a measured
 * instance of the shield imposing no cost on clean input — the false-positive
 * question, which is the first thing anyone sensible asks about a filter. A
 * tick where they diverge would be a measured instance of the shield changing
 * an order that a hostile headline would otherwise have changed.
 *
 * No PnL delta is claimed and none should be inferred. Over this window no
 * adversarial headline organically appeared in the feed, so the honest reading
 * is "the shield cost nothing on N clean ticks," not "the shield made money."
 * Re-derive every figure below, for every log, with:
 *   node scripts/canary-figures.mjs
 *
 * Last verified: 2026-09-17.
 */
export const CANARY = {
  cadence: "every 15 minutes",
  account: "Bitget Demo (paper) only, never live funds",
  ticks: 205,
  spanHours: 51.0,
  /** Ticks on which a real Demo order was actually placed, per account. */
  ordersPlaced: 152,
  agreementRate: "205 of 205",
  symbols: "BTCUSDT and ETHUSDT, logged separately",
  claim: "Same symbol, same live feed, same agent. The shield is the only variable.",
  divergence:
    "Control and shielded have agreed on all 205 ticks. The shield costs nothing on clean input. No PnL delta is claimed.",
} as const;
