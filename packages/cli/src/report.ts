/**
 * Renders a `Scorecard` as a judge-facing artifact: a plain-text console
 * summary for `arka attack`/`arka score`, and a static, dependency-free HTML
 * report card for `arka report`. Every number rendered here comes straight
 * off the `Scorecard` object — this module formats, it never computes.
 */
import type { AttackFamily, Scorecard } from "@heyarka/core";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

const FAMILY_LABELS: Record<AttackFamily, string> = {
  homoglyph: "Homoglyph injection",
  "hidden-text": "Hidden-text clauses",
  "tool-hijack": "Tool-call hijack",
  "semantic-trap": "Semantic traps",
  "look-ahead": "Look-ahead / memorization",
  "sentiment-filter": "Sentiment-filter poisoning",
};

export function renderConsoleSummary(card: Scorecard): string {
  const lines: string[] = [];
  lines.push(`HeyArka scorecard — ${card.agentName}`);
  lines.push(`generated ${card.generatedAt}`);
  lines.push("");
  lines.push(`  grade                          ${card.grade}`);
  lines.push(`  vectors run                    ${card.totalVectors}`);
  if (card.erroredVectors > 0) {
    // Said before any rate, because every rate below is over fewer vectors
    // than were run, and a reader who stops at the grade line must not miss it.
    lines.push(
      `  ERRORED                        ${card.erroredVectors} of ${card.totalVectors} vectors got no ` +
        `decision from the agent — rates below cover the ${card.totalVectors - card.erroredVectors} that did, ` +
        `and no grade is given`,
    );
  }
  lines.push(`  injection susceptibility rate  ${pct(card.injectionSusceptibilityRate)}`);
  lines.push(`  risk-violation rate            ${pct(card.riskViolationRate)}`);
  lines.push(`  decision consistency           ${pct(card.decisionConsistency)}`);
  lines.push(`  look-ahead contamination       ${pct(card.lookAheadContaminationScore)}`);
  lines.push(`  human-takeover rate            ${pct(card.humanTakeoverRate)}`);
  lines.push(
    `  recognition-execution gap      ${
      card.recognitionExecutionGap === undefined
        ? "no evidence (agent emits no rationales)"
        : pct(card.recognitionExecutionGap)
    }`,
  );
  lines.push("");
  lines.push("  by family:");
  for (const [family, stats] of Object.entries(card.byFamily) as [AttackFamily, { total: number; succeeded: number }][]) {
    if (stats.total === 0) continue;
    lines.push(`    ${FAMILY_LABELS[family].padEnd(30)} ${stats.succeeded}/${stats.total} succeeded`);
  }

  /*
   * Measurement conditions print with every scorecard, never as an appendix.
   * A susceptibility rate quoted without them is not a comparable number.
   */
  const c = card.conditions;
  lines.push("");
  lines.push("  measured under:");
  lines.push(`    corpus                       ${c.corpusVersion}`);
  lines.push(`    vectors adjudicated          ${c.vectorsAdjudicated}`);
  lines.push(`    shield                       ${c.shielded ? "on" : "off"}`);
  lines.push(`    judging view                 ${c.judgingView} (adjudicated on the order)`);
  lines.push(`    clean context per vector     ${c.cleanContext ? "yes" : "no"}`);
  lines.push(`    risk contract enforced       ${c.riskContractApplied ? "yes" : "no"}`);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gradeColor(grade: Scorecard["grade"]): string {
  switch (grade) {
    case "A": return "#1a7f37";
    case "B": return "#3fb950";
    case "C": return "#d4a72c";
    case "D": return "#e0823d";
    case "F": return "#cf222e";
    case "INCOMPLETE": return "#6e7781";
  }
}

/** Renders a self-contained, dependency-free HTML report card from a Scorecard. */
export function renderHtmlReport(card: Scorecard): string {
  const familyRows = (Object.entries(card.byFamily) as [AttackFamily, { total: number; succeeded: number }][])
    .filter(([, stats]) => stats.total > 0)
    .map(
      ([family, stats]) => `
        <tr>
          <td>${escapeHtml(FAMILY_LABELS[family])}</td>
          <td>${stats.succeeded} / ${stats.total}</td>
          <td>${pct(stats.total === 0 ? 0 : stats.succeeded / stats.total)}</td>
        </tr>`,
    )
    .join("");

  const resultRows = card.results
    .map(
      (r) => `
        <tr>
          <td>${escapeHtml(r.vectorId)}</td>
          <td>${escapeHtml(r.family)}</td>
          <td>${r.succeeded ? "yes" : "no"}</td>
          <td>${escapeHtml(r.delta)}</td>
          <td>${r.riskViolations.length > 0 ? escapeHtml(r.riskViolations.join("; ")) : "-"}</td>
          <td>${r.shielded ? "shielded" : "bare"}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HeyArka report — ${escapeHtml(card.agentName)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 16px; color: #1f2328; }
  h1 { margin-bottom: 4px; }
  .meta { color: #57606a; margin-bottom: 24px; }
  .grade { display: inline-block; font-size: 48px; font-weight: 700; color: white; background: ${gradeColor(card.grade)}; width: 72px; height: 72px; line-height: 72px; text-align: center; border-radius: 12px; margin-right: 16px; vertical-align: middle; }
  .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 24px 0; }
  .metric { border: 1px solid #d0d7de; border-radius: 8px; padding: 12px 16px; }
  .metric .label { font-size: 12px; color: #57606a; text-transform: uppercase; letter-spacing: 0.03em; }
  .metric .value { font-size: 24px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0 32px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #d0d7de; font-size: 14px; }
  th { color: #57606a; font-weight: 600; }
  code { background: #f6f8fa; padding: 1px 4px; border-radius: 4px; }
</style>
</head>
<body>
  <h1><span class="grade">${card.grade === "INCOMPLETE" ? "?" : card.grade}</span>${escapeHtml(card.agentName)}</h1>
  ${
    card.erroredVectors > 0
      ? `<p><strong>Incomplete run:</strong> ${card.erroredVectors} of ${card.totalVectors} vectors got no decision from the agent. The rates below cover only the vectors that did, and no grade is given.</p>`
      : ""
  }
  <div class="meta">Generated ${escapeHtml(card.generatedAt)} &middot; ${card.totalVectors} vectors run</div>

  <div class="metrics">
    <div class="metric"><div class="label">Injection susceptibility</div><div class="value">${pct(card.injectionSusceptibilityRate)}</div></div>
    <div class="metric"><div class="label">Risk-violation rate</div><div class="value">${pct(card.riskViolationRate)}</div></div>
    <div class="metric"><div class="label">Decision consistency</div><div class="value">${pct(card.decisionConsistency)}</div></div>
    <div class="metric"><div class="label">Look-ahead contamination</div><div class="value">${pct(card.lookAheadContaminationScore)}</div></div>
    <div class="metric"><div class="label">Human-takeover rate</div><div class="value">${pct(card.humanTakeoverRate)}</div></div>
    <div class="metric"><div class="label">Recognition-execution gap</div><div class="value">${
      card.recognitionExecutionGap === undefined
        ? "n/a"
        : pct(card.recognitionExecutionGap)
    }</div></div>
  </div>

  <h2>Measured under</h2>
  <p class="meta">These rates are comparable only against a run sharing these conditions.</p>
  <table>
    <tbody>
      <tr><th>Corpus</th><td><code>${escapeHtml(card.conditions.corpusVersion)}</code></td></tr>
      <tr><th>Vectors adjudicated</th><td>${card.conditions.vectorsAdjudicated}</td></tr>
      <tr><th>Families</th><td>${escapeHtml(card.conditions.families.join(", "))}</td></tr>
      <tr><th>Shield</th><td>${card.conditions.shielded ? "on" : "off"}</td></tr>
      <tr><th>Judging view</th><td>${escapeHtml(card.conditions.judgingView)} (adjudicated on the resulting order, not the agent's narration)</td></tr>
      <tr><th>Clean context per vector</th><td>${card.conditions.cleanContext ? "yes" : "no"}</td></tr>
      <tr><th>Risk contract enforced</th><td>${card.conditions.riskContractApplied ? "yes" : "no"}</td></tr>
    </tbody>
  </table>

  <h2>By attack family</h2>
  <table>
    <thead><tr><th>Family</th><th>Succeeded</th><th>Rate</th></tr></thead>
    <tbody>${familyRows}</tbody>
  </table>

  <h2>All results</h2>
  <table>
    <thead><tr><th>Vector</th><th>Family</th><th>Succeeded</th><th>Delta</th><th>Risk violations</th><th>Mode</th></tr></thead>
    <tbody>${resultRows}</tbody>
  </table>
</body>
</html>
`;
}
