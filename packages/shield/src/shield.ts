/**
 * The composed shield: wraps a real `AgentUnderTest` and returns another one
 * with identical shape, so it drops into `runVector`/`runCorpus` exactly like
 * any other agent — including the same unwrapped agent, run through the
 * corpus twice, once bare and once shielded, for the A/B comparison the
 * scorecard reports.
 *
 * Pipeline: sanitize -> corroboration gate -> point-in-time guard -> agent.decide
 * -> risk contract enforcement. The last step is the one no attack in the
 * corpus can talk its way past: it runs after the model has already decided,
 * on the returned order alone, and never reads news text.
 */
import { checkRiskContract } from "@heyarka/core";
import type { AgentUnderTest, MarketContext, NewsItem, ProposedOrder, RiskContract } from "@heyarka/core";
import { sanitizeNewsItem } from "./sanitize.js";
import { applyCorroborationGate } from "./corroboration.js";
import { applyPointInTimeGuard } from "./point-in-time.js";

export interface ShieldOptions {
  /** Enforced deterministically against the agent's output; violating orders are vetoed to hold. */
  riskContract?: RiskContract;
  /** Called with what each layer changed, for the audit trail. Never affects the decision. */
  onAudit?: (event: ShieldAuditEvent) => void;
}

export type ShieldAuditEvent =
  | { layer: "sanitize"; itemId: string; findings: string[] }
  | { layer: "corroboration"; representative: string; collapsedIds: string[]; independentSourceCount: number }
  | { layer: "point-in-time"; rejected: NewsItem[]; reason: "future" | "replay" }
  | { layer: "risk-contract"; order: ProposedOrder; violations: string[] };

function preprocess(ctx: MarketContext, onAudit?: ShieldOptions["onAudit"]): MarketContext {
  const sanitized = ctx.news.map((item) => {
    const { item: cleaned, result } = sanitizeNewsItem(item);
    if (result.wasModified) onAudit?.({ layer: "sanitize", itemId: item.id, findings: result.findings });
    return cleaned;
  });

  const corroborated = applyCorroborationGate(sanitized);
  for (const group of corroborated.collapsed) {
    onAudit?.({
      layer: "corroboration",
      representative: group.representative,
      collapsedIds: group.collapsedIds,
      independentSourceCount: group.independentSourceCount,
    });
  }

  const pit = applyPointInTimeGuard({ ...ctx, news: corroborated.items });
  if (pit.rejectedFuture.length > 0) {
    onAudit?.({ layer: "point-in-time", rejected: pit.rejectedFuture, reason: "future" });
  }
  if (pit.rejectedReplay.length > 0) {
    onAudit?.({ layer: "point-in-time", rejected: pit.rejectedReplay, reason: "replay" });
  }

  return { ...ctx, news: pit.items };
}

/** The order returned when the risk contract vetoes the model's proposed order. */
function vetoedOrder(order: ProposedOrder): ProposedOrder {
  return {
    side: "hold",
    symbol: order.symbol,
    size: 0,
    rationale: `vetoed by risk contract (original: ${order.side} ${order.size} ${order.symbol})`,
    requiresHumanApproval: true,
  };
}

/**
 * Wraps `agent` so every `decide` call runs the full shield pipeline first.
 * The returned agent has the same `AgentUnderTest` shape, so it is a drop-in
 * replacement anywhere the bare agent is used — including inside the harness
 * itself, which is how the A/B comparison works.
 */
export function shieldAgent(agent: AgentUnderTest, options: ShieldOptions = {}): AgentUnderTest {
  const { riskContract, onAudit } = options;
  return {
    name: `${agent.name}+shield`,
    async decide(ctx: MarketContext): Promise<ProposedOrder> {
      const cleaned = preprocess(ctx, onAudit);
      const order = await agent.decide(cleaned);

      if (riskContract === undefined) return order;

      const violations = checkRiskContract(order, riskContract);
      if (violations.length > 0) {
        onAudit?.({ layer: "risk-contract", order, violations });
        return vetoedOrder(order);
      }
      return order;
    },
  };
}
