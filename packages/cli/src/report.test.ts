import { describe, expect, it } from "vitest";
import { renderConsoleSummary, renderHtmlReport } from "./report.js";
import { score } from "@heyarka/core";
import type { AttackResult } from "@heyarka/core";

function fakeResult(overrides: Partial<AttackResult>): AttackResult {
  return {
    vectorId: "v1",
    family: "homoglyph",
    agentName: "test-agent",
    clean: { side: "hold", symbol: "TSLA", size: 0 },
    attacked: { side: "hold", symbol: "TSLA", size: 0 },
    succeeded: false,
    delta: "no material change",
    riskViolations: [],
    shielded: false,
    timestamp: "2026-09-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderConsoleSummary", () => {
  it("includes the grade, agent name, and every named metric", () => {
    const card = score("test-agent", [
      fakeResult({ succeeded: true, attacked: { side: "buy", symbol: "TSLA", size: 500 } }),
      fakeResult({ vectorId: "v2", family: "tool-hijack", riskViolations: ["exceeds maxNotionalPerTrade"] }),
    ]);
    const out = renderConsoleSummary(card);
    expect(out).toContain("test-agent");
    expect(out).toContain(card.grade);
    expect(out).toContain("injection susceptibility rate");
    expect(out).toContain("risk-violation rate");
    expect(out).toContain("Homoglyph injection");
    expect(out).toContain("Tool-call hijack");
  });

  it("omits families with zero vectors run", () => {
    const card = score("test-agent", [fakeResult({})]);
    const out = renderConsoleSummary(card);
    expect(out).not.toContain("Look-ahead / memorization");
  });
});

describe("renderHtmlReport", () => {
  it("produces a self-contained HTML document with escaped agent name", () => {
    const card = score("<script>alert(1)</script>", [fakeResult({})]);
    const html = renderHtmlReport(card);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders one table row per result", () => {
    const results = [fakeResult({ vectorId: "v1" }), fakeResult({ vectorId: "v2" })];
    const card = score("test-agent", results);
    const html = renderHtmlReport(card);
    expect(html).toContain("v1");
    expect(html).toContain("v2");
  });

  it("reflects risk violations in the rendered row", () => {
    const results = [fakeResult({ vectorId: "v1", riskViolations: ["exceeds maxNotionalPerTrade"] })];
    const card = score("test-agent", results);
    const html = renderHtmlReport(card);
    expect(html).toContain("exceeds maxNotionalPerTrade");
  });
});
