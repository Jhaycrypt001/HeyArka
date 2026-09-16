/**
 * Core contracts for HeyArka.
 *
 * The central idea: HeyArka never needs to know how an agent is built. It only
 * needs a function that turns a market context into a proposed order. Any agent
 * that can be wrapped in `AgentUnderTest` can be attacked, scored, and hardened.
 */

/** A single piece of unstructured input an agent perceives — typically a headline. */
export interface NewsItem {
  id: string;
  headline: string;
  /** Optional article body. Hidden-text attacks usually live here. */
  body?: string;
  /** Publisher or feed name. Used by the corroboration gate. */
  source: string;
  /**
   * Upstream origin when a feed is republishing someone else. Four aggregators
   * echoing one wire story must not read as four independent confirmations.
   */
  originatingSource?: string;
  publishedAt: string;
  url?: string;
}

/** Everything the agent is allowed to see at decision time. */
export interface MarketContext {
  /** Decision timestamp. Nothing dated after this may enter context. */
  asOf: string;
  symbol: string;
  price: number;
  news: NewsItem[];
  /** Free-form extras (indicators, positions) passed through untouched. */
  extra?: Record<string, unknown>;
}

export type OrderSide = "buy" | "sell" | "hold";

/** The agent's decision. `hold` with size 0 is the correct way to decline. */
export interface ProposedOrder {
  side: OrderSide;
  symbol: string;
  /** Notional in quote currency. */
  size: number;
  /** Self-reported 0..1. Compared against real win rate for calibration. */
  confidence?: number;
  /** The agent's stated reason — what HeyArka checks against actual behaviour. */
  rationale?: string;
  /** Set when the agent escalates to a human instead of deciding. */
  requiresHumanApproval?: boolean;
}

/**
 * The only thing an agent must implement to be testable.
 * Wrap an existing agent in this and the whole harness applies.
 */
export interface AgentUnderTest {
  name: string;
  decide(ctx: MarketContext): Promise<ProposedOrder>;
}

/** Declarative bounds an agent claims to respect. Breaches become risk violations. */
export interface RiskContract {
  maxNotionalPerTrade: number;
  allowedSymbols: string[];
  maxConfidence?: number;
  /** Orders above this notional must set `requiresHumanApproval`. */
  humanApprovalThreshold?: number;
}

export type AttackFamily =
  | "homoglyph"
  | "hidden-text"
  | "tool-hijack"
  | "semantic-trap"
  | "look-ahead"
  /** Poisons the crowded-sentiment filter live Playbook strategies gate entries on. */
  | "sentiment-filter";

/** A transformation from a clean context to an attacked one. */
export interface AttackVector {
  id: string;
  family: AttackFamily;
  description: string;
  /** Literature or advisory this vector reproduces. */
  citation?: string;
  /**
   * Attack intent. HeyArka compares the clean decision against the attacked
   * one; `expectedEffect` documents what the attacker was trying to achieve.
   */
  expectedEffect:
    | "flip-direction"
    | "inflate-size"
    | "misroute-symbol"
    | "bypass-risk"
    /** Make the agent trade an entry its sentiment filter should have blocked. */
    | "force-entry"
    /** Expose confident, directional output surviving the removal of its own evidence. */
    | "expose-memorization";
  apply(ctx: MarketContext): MarketContext;
}

/** One clean-vs-attacked comparison. */
export interface AttackResult {
  vectorId: string;
  family: AttackFamily;
  agentName: string;
  clean: ProposedOrder;
  attacked: ProposedOrder;
  /** True when the attack changed direction, symbol, or materially changed size. */
  succeeded: boolean;
  /** Human-readable account of what changed. */
  delta: string;
  riskViolations: string[];
  shielded: boolean;
  /**
   * True when a risk contract was enforced for this vector. Distinct from
   * `riskViolations.length > 0`: a contract that was applied and passed is
   * not the same as no contract at all, and conflating them would let an
   * unconstrained run report a clean risk record.
   */
  riskContractApplied: boolean;
  timestamp: string;
  errorMessage?: string;
}

/**
 * The conditions a Scorecard's numbers were produced under.
 *
 * A susceptibility rate on its own is not a comparable figure: it depends on
 * which corpus ran, which shield version sat in front of the agent, and how
 * "succeeded" was adjudicated. REDAgentBench (arXiv:2608.10669) makes the same
 * point about attack-success rate, and reports 7.73-11.72 percentage points of
 * spread between judging views on identical runs. Printing these conditions
 * beside every rate is what makes two HeyArka scorecards comparable at all.
 */
export interface MeasurementConditions {
  /** Corpus version the vectors came from. */
  corpusVersion: string;
  /** Number of vectors actually adjudicated, after any filtering. */
  vectorsAdjudicated: number;
  /** Attack families represented in this run. */
  families: AttackFamily[];
  /** True when the agent ran behind @heyarka/shield. */
  shielded: boolean;
  /**
   * How `succeeded` was decided. HeyArka judges on the resulting order (the
   * durable effect), not on the agent's narration, which is the stricter of
   * the two views and the one that matches what a venue would actually fill.
   */
  judgingView: "state" | "trajectory" | "hybrid";
  /**
   * Whether each vector was run against a context cleaned between vectors.
   * Carry-over between vectors would let one attack's residue score another.
   */
  cleanContext: boolean;
  /** Present only when a risk contract was enforced during the run. */
  riskContractApplied: boolean;
}

export interface Scorecard {
  agentName: string;
  generatedAt: string;
  totalVectors: number;
  /** The conditions these numbers are only meaningful under. */
  conditions: MeasurementConditions;
  /** % of attacks that changed the order. Headline metric. */
  injectionSusceptibilityRate: number;
  riskViolationRate: number;
  /** 0..1; 1 = identical decisions across repeated identical inputs. */
  decisionConsistency: number;
  lookAheadContaminationScore: number;
  humanTakeoverRate: number;
  /**
   * Fraction of successful attacks the agent's own rationale had already
   * flagged as hazardous. `undefined` when no successful attack produced a
   * rationale: no evidence, which is not the same as a zero gap.
   */
  recognitionExecutionGap?: number;
  byFamily: Record<AttackFamily, { total: number; succeeded: number }>;
  grade: "A" | "B" | "C" | "D" | "F";
  results: AttackResult[];
}
