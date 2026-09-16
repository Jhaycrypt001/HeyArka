/**
 * Tool implementations. Every handler here calls straight into
 * `@heyarka/core` / `@heyarka/shield` — the same functions the CLI and the
 * test suites use — so an MCP client gets the real engine, not a
 * reimplementation or a canned response. What an MCP tool call can *not* do
 * is hand over a live `AgentUnderTest.decide()` (there is no way to execute
 * a client's arbitrary agent code over the protocol), so these tools expose
 * the parts of the harness that operate on data rather than on a running
 * agent: applying/listing attack vectors, shielding a context, checking a
 * risk contract, and scoring a batch of results a client ran itself.
 */
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  CORPUS,
  checkRiskContract,
  score,
  type AttackResult,
  type MarketContext,
  type ProposedOrder,
  type RiskContract,
} from "@heyarka/core";
import { sanitizeNewsItem, applyCorroborationGate, applyPointInTimeGuard } from "@heyarka/shield";
import type { ShieldAuditEvent } from "@heyarka/shield";
import { marketContextSchema, riskContractSchema } from "./schemas.js";

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export const listAttackVectorsInput = {};

export function listAttackVectors(): CallToolResult {
  return jsonResult({
    total: CORPUS.length,
    vectors: CORPUS.map((v) => ({
      id: v.id,
      family: v.family,
      description: v.description,
      expectedEffect: v.expectedEffect,
      citation: v.citation,
    })),
  });
}

export const applyAttackVectorInput = {
  vectorId: z.string().describe("id of a vector from list_attack_vectors, e.g. \"homoglyph-phantom-symbol\""),
  context: marketContextSchema,
};

export function applyAttackVector(args: { vectorId: string; context: MarketContext }): CallToolResult {
  const vector = CORPUS.find((v) => v.id === args.vectorId);
  if (!vector) {
    return errorResult(
      `Unknown vector id "${args.vectorId}". Call list_attack_vectors for valid ids.`,
    );
  }
  const attacked = vector.apply(args.context);
  return jsonResult({ vectorId: vector.id, family: vector.family, expectedEffect: vector.expectedEffect, attackedContext: attacked });
}

export const shieldContextInput = {
  context: marketContextSchema,
};

/**
 * Runs the real sanitize -> corroboration -> point-in-time pipeline (the
 * same preprocessing `shieldAgent()` applies before calling `decide()`) and
 * returns both the cleaned context and a full audit trail of what each
 * layer changed, so a client can inspect the shield's effect without
 * needing to wrap a live agent.
 */
export function shieldContext(args: { context: MarketContext }): CallToolResult {
  const events: ShieldAuditEvent[] = [];

  const sanitized = args.context.news.map((item) => {
    const { item: cleaned, result } = sanitizeNewsItem(item);
    if (result.wasModified) events.push({ layer: "sanitize", itemId: item.id, findings: result.findings });
    return cleaned;
  });

  const corroborated = applyCorroborationGate(sanitized);
  for (const group of corroborated.collapsed) {
    events.push({
      layer: "corroboration",
      representative: group.representative,
      collapsedIds: group.collapsedIds,
      independentSourceCount: group.independentSourceCount,
    });
  }

  const pit = applyPointInTimeGuard({ ...args.context, news: corroborated.items });
  if (pit.rejectedFuture.length > 0) events.push({ layer: "point-in-time", rejected: pit.rejectedFuture, reason: "future" });
  if (pit.rejectedReplay.length > 0) events.push({ layer: "point-in-time", rejected: pit.rejectedReplay, reason: "replay" });

  return jsonResult({
    cleanedContext: { ...args.context, news: pit.items },
    itemsRemoved: args.context.news.length - pit.items.length,
    auditTrail: events,
  });
}

export const checkRiskContractInput = {
  order: z.object({
    side: z.enum(["buy", "sell", "hold"]),
    symbol: z.string(),
    size: z.number(),
    confidence: z.number().optional(),
    rationale: z.string().optional(),
    requiresHumanApproval: z.boolean().optional(),
  }),
  riskContract: riskContractSchema,
};

/** Deterministic, non-LLM veto check — the same function the shield's final layer enforces. */
export function checkRiskContractTool(args: { order: ProposedOrder; riskContract: RiskContract }): CallToolResult {
  const violations = checkRiskContract(args.order, args.riskContract);
  return jsonResult({ compliant: violations.length === 0, violations });
}

const attackResultSchema = z.object({
  vectorId: z.string(),
  family: z.enum(["homoglyph", "hidden-text", "tool-hijack", "semantic-trap", "look-ahead", "sentiment-filter"]),
  agentName: z.string(),
  clean: z.object({
    side: z.enum(["buy", "sell", "hold"]),
    symbol: z.string(),
    size: z.number(),
    confidence: z.number().optional(),
    rationale: z.string().optional(),
    requiresHumanApproval: z.boolean().optional(),
  }),
  attacked: z.object({
    side: z.enum(["buy", "sell", "hold"]),
    symbol: z.string(),
    size: z.number(),
    confidence: z.number().optional(),
    rationale: z.string().optional(),
    requiresHumanApproval: z.boolean().optional(),
  }),
  succeeded: z.boolean(),
  delta: z.string(),
  riskViolations: z.array(z.string()),
  shielded: z.boolean(),
  /*
   * Defaults to false for callers scoring results they produced before this
   * field existed. False is the honest default: it claims no risk contract was
   * enforced, which understates rather than overstates the run's rigour.
   */
  riskContractApplied: z.boolean().default(false),
  timestamp: z.string(),
  errorMessage: z.string().optional(),
});

export const scoreResultsInput = {
  agentName: z.string(),
  results: z.array(attackResultSchema).describe("AttackResults produced by running the corpus against your own agent"),
};

/**
 * Scores a batch of AttackResults the client ran itself (e.g. by calling
 * apply_attack_vector once per vector against their own agent, out-of-band).
 * This is the same `score()` used by `arka score` and the test suites — the
 * MCP server never fabricates a scorecard, it only aggregates real results
 * the caller supplies.
 */
export function scoreResultsTool(args: { agentName: string; results: AttackResult[] }): CallToolResult {
  const card = score(args.agentName, args.results);
  return jsonResult(card);
}
