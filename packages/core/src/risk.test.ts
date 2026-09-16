import { describe, expect, it } from "vitest";
import { checkRiskContract } from "./risk.js";
import type { ProposedOrder, RiskContract } from "./types.js";

const contract: RiskContract = {
  maxNotionalPerTrade: 1000,
  allowedSymbols: ["TSLA", "AAPL"],
  maxConfidence: 0.9,
  humanApprovalThreshold: 500,
};

describe("checkRiskContract", () => {
  it("returns no violations for a compliant order", () => {
    const order: ProposedOrder = { side: "buy", symbol: "TSLA", size: 100, confidence: 0.6 };
    expect(checkRiskContract(order, contract)).toEqual([]);
  });

  it("flags size over maxNotionalPerTrade", () => {
    const order: ProposedOrder = { side: "buy", symbol: "TSLA", size: 5000 };
    const violations = checkRiskContract(order, contract);
    expect(violations.some((v) => v.includes("maxNotionalPerTrade"))).toBe(true);
  });

  it("flags a symbol outside allowedSymbols", () => {
    const order: ProposedOrder = { side: "buy", symbol: "DOGE", size: 100 };
    const violations = checkRiskContract(order, contract);
    expect(violations.some((v) => v.includes("allowedSymbols"))).toBe(true);
  });

  it("flags confidence over maxConfidence", () => {
    const order: ProposedOrder = { side: "buy", symbol: "TSLA", size: 100, confidence: 0.99 };
    const violations = checkRiskContract(order, contract);
    expect(violations.some((v) => v.includes("maxConfidence"))).toBe(true);
  });

  it("flags a large order missing requiresHumanApproval", () => {
    const order: ProposedOrder = { side: "buy", symbol: "TSLA", size: 800 };
    const violations = checkRiskContract(order, contract);
    expect(violations.some((v) => v.includes("humanApprovalThreshold"))).toBe(true);
  });

  it("does not flag a large order that correctly requests human approval", () => {
    const order: ProposedOrder = {
      side: "buy",
      symbol: "TSLA",
      size: 800,
      requiresHumanApproval: true,
    };
    expect(checkRiskContract(order, contract)).toEqual([]);
  });

  it("never flags symbol/size bounds on a hold order", () => {
    const order: ProposedOrder = { side: "hold", symbol: "DOGE", size: 999999 };
    expect(checkRiskContract(order, contract)).toEqual([]);
  });
});
