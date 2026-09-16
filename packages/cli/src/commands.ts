/**
 * The three `arka` subcommands. Each is a plain async function taking parsed
 * args and returning an exit code, so `bin.ts` stays a thin dispatcher and
 * these stay independently testable without spawning a process.
 */
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import {
  CORPUS,
  appendResult,
  readResults,
  runCorpus,
  score,
  type AgentUnderTest,
  type AttackResult,
  type RiskContract,
} from "@heyarka/core";
import { shieldAgent } from "@heyarka/shield";
import { createDemoAgent } from "./demo-agent.js";
import { demoContext, demoRiskContract } from "./demo-context.js";
import { loadAgent } from "./load-agent.js";
import { cleanupRepoClone, loadRepoAgent } from "./load-repo-agent.js";
import { renderConsoleSummary, renderHtmlReport } from "./report.js";

export interface AttackArgs {
  demo: boolean;
  agentPath?: string;
  repoUrl?: string;
  repoEntry?: string;
  shielded: boolean;
  outPath: string;
  reportPath?: string;
}

async function ensureParentDir(path: string): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
}

function uniqueAgentNames(results: readonly AttackResult[]): string[] {
  return [...new Set(results.map((r) => r.agentName))];
}

/**
 * A JSONL log is append-only and `arka attack` defaults every run to the
 * same `--out` path, so a log commonly accumulates results from more than
 * one agent (e.g. an unshielded run followed by a `--shielded` run). Scoring
 * or reporting the raw file unfiltered silently blends unrelated agents into
 * one Scorecard. This picks out only the rows for the requested agent —
 * explicit `agentName`, or the single agent already in the log when there is
 * only one — and returns undefined when that agent has no matching rows, so
 * the caller can fail loudly instead of producing a misleading number.
 */
function selectAgentResults(
  results: readonly AttackResult[],
  agentName: string | undefined,
): { agentName: string; results: AttackResult[] } | undefined {
  const names = uniqueAgentNames(results);
  const targetName = agentName ?? (names.length === 1 ? names[0] : undefined);
  if (targetName === undefined) return undefined;

  const filtered = results.filter((r) => r.agentName === targetName);
  if (filtered.length === 0) return undefined;

  return { agentName: targetName, results: filtered };
}

export async function runAttack(args: AttackArgs): Promise<number> {
  let agent: AgentUnderTest;
  let context = demoContext();
  let riskContract: RiskContract = demoRiskContract();
  let cloneDir: string | undefined;

  if (args.demo) {
    agent = createDemoAgent();
  } else if (args.agentPath) {
    agent = await loadAgent(args.agentPath);
  } else if (args.repoUrl) {
    if (!args.repoEntry) {
      console.error(
        "arka attack --repo: also pass --entry <path-inside-the-repo> for the module exporting the agent. " +
          "A third-party repo's layout can't be guessed, so this is required rather than assumed.",
      );
      return 1;
    }
    const loaded = await loadRepoAgent(args.repoUrl, args.repoEntry);
    agent = loaded.agent;
    cloneDir = loaded.cloneDir;
  } else {
    console.error(
      "arka attack: pass --demo for the zero-config bundled agent, --agent <path> to test your own, " +
        "or --repo <git-url> --entry <path> to test a public repo's agent.",
    );
    return 1;
  }

  try {
    const finalAgent = args.shielded ? shieldAgent(agent, { riskContract }) : agent;

    console.log(`Running ${CORPUS.length} attack vectors against ${finalAgent.name}${args.shielded ? " (shielded)" : ""}...`);

    const results = await runCorpus({
      agent: finalAgent,
      corpus: CORPUS,
      cleanContext: context,
      riskContract,
      shielded: args.shielded,
      onResult: (result, index, total) => {
        const mark = result.succeeded ? "FLIPPED" : "held";
        process.stdout.write(`  [${index + 1}/${total}] ${result.vectorId.padEnd(34)} ${mark}\n`);
      },
    });

    await ensureParentDir(args.outPath);
    for (const result of results) {
      await appendResult(args.outPath, result);
    }
    console.log(`\nAppended ${results.length} results to ${args.outPath}`);

    const card = score(finalAgent.name, results);
    console.log("");
    console.log(renderConsoleSummary(card));

    if (args.reportPath) {
      await ensureParentDir(args.reportPath);
      await writeFile(args.reportPath, renderHtmlReport(card), "utf8");
      console.log(`\nHTML report written to ${args.reportPath}`);
    }

    return 0;
  } finally {
    if (cloneDir) await cleanupRepoClone(cloneDir);
  }
}

export interface ScoreArgs {
  inPath: string;
  agentName?: string;
}

export async function runScore(args: ScoreArgs): Promise<number> {
  const allResults = await readResults(args.inPath);
  if (allResults.length === 0) {
    console.error(`arka score: no results found in ${args.inPath}`);
    return 1;
  }
  const selected = selectAgentResults(allResults, args.agentName);
  if (selected === undefined) {
    console.error(
      `arka score: no results for agent "${args.agentName}" in ${args.inPath}. ` +
        `Agents present: ${uniqueAgentNames(allResults).join(", ")}`,
    );
    return 1;
  }
  const card = score(selected.agentName, selected.results);
  console.log(renderConsoleSummary(card));
  return 0;
}

export interface ReportArgs {
  inPath: string;
  outPath: string;
  agentName?: string;
}

export async function runReport(args: ReportArgs): Promise<number> {
  const allResults = await readResults(args.inPath);
  if (allResults.length === 0) {
    console.error(`arka report: no results found in ${args.inPath}`);
    return 1;
  }
  const selected = selectAgentResults(allResults, args.agentName);
  if (selected === undefined) {
    console.error(
      `arka report: no results for agent "${args.agentName}" in ${args.inPath}. ` +
        `Agents present: ${uniqueAgentNames(allResults).join(", ")}`,
    );
    return 1;
  }
  const card = score(selected.agentName, selected.results);
  await ensureParentDir(args.outPath);
  await writeFile(args.outPath, renderHtmlReport(card), "utf8");
  console.log(`HTML report written to ${args.outPath}`);
  return 0;
}
