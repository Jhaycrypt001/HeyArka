/**
 * Deterministic, non-LLM evaluation of a proposed order against a declared
 * risk contract. This is the code half of the Trust Boundaries claim in
 * ARCHITECTURE.md: the risk contract never sees prose, so no injected text
 * can argue it into compliance.
 */
import type { ProposedOrder, RiskContract } from "./types.js";

/**
 * Every declared bound the order breaches, as human-readable strings. An
 * empty array means the order is within contract. Pure and total — never
 * throws, always returns.
 */
export function checkRiskContract(order: ProposedOrder, contract: RiskContract): string[] {
  const violations: string[] = [];

  if (order.side !== "hold") {
    if (order.size > contract.maxNotionalPerTrade) {
      violations.push(
        `size ${order.size} exceeds maxNotionalPerTrade ${contract.maxNotionalPerTrade}`,
      );
    }
    if (!contract.allowedSymbols.includes(order.symbol)) {
      violations.push(
        `symbol ${order.symbol} not in allowedSymbols [${contract.allowedSymbols.join(", ")}]`,
      );
    }
  }

  if (
    contract.maxConfidence !== undefined &&
    order.confidence !== undefined &&
    order.confidence > contract.maxConfidence
  ) {
    violations.push(`confidence ${order.confidence} exceeds maxConfidence ${contract.maxConfidence}`);
  }

  if (
    contract.humanApprovalThreshold !== undefined &&
    order.side !== "hold" &&
    order.size > contract.humanApprovalThreshold &&
    order.requiresHumanApproval !== true
  ) {
    violations.push(
      `size ${order.size} exceeds humanApprovalThreshold ${contract.humanApprovalThreshold} without requiresHumanApproval`,
    );
  }

  return violations;
}
