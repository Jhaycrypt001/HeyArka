#!/usr/bin/env node
import { parseArgs, flagString, flagBoolean } from "./args.js";
import { runAttack, runScore, runReport } from "./commands.js";

const HELP = `arka — HeyArka adversarial evaluation harness for LLM trading agents

Usage:
  arka attack --demo [--shielded] [--out <path>] [--report <path>]
  arka attack --agent <path> [--shielded] [--out <path>] [--report <path>]
  arka attack --repo <git-url> --entry <path> [--shielded] [--out <path>] [--report <path>]
  arka score <results.jsonl> [--agent-name <name>]
  arka report <results.jsonl> --out <report.html> [--agent-name <name>]

Commands:
  attack   Run the full attack corpus against an agent and append results
           to a JSONL log. --demo uses the bundled zero-config reference
           agent; --agent <path> loads a real agent module exporting an
           AgentUnderTest (default export, "agent" export, or a factory);
           --repo <git-url> --entry <path> shallow-clones a public repo and
           loads --entry (relative to the clone root) the same way --agent
           does. Only clones and imports code from repos you have the right
           to test — see the README's disclosure policy before pointing this
           at anyone else's project.
           --shielded wraps the agent in @heyarka/shield before attacking it.
  score    Recompute and print a Scorecard from an existing JSONL log.
  report   Recompute a Scorecard and render it as a static HTML report card.

Options:
  --out <path>         JSONL log path for "attack" (default: reports/results.jsonl)
  --report <path>      Also render an HTML report card after "attack"
  --agent-name <name>  Override the agent name used to label a Scorecard
  --entry <path>       Module path (relative to the repo root) exporting the
                        agent, required with --repo
`;

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  const { positionals, flags } = parseArgs(rest);

  switch (command) {
    case "attack": {
      const demo = flagBoolean(flags, "demo");
      const agentPath = flagString(flags, "agent");
      const repoUrl = flagString(flags, "repo");
      const repoEntry = flagString(flags, "entry");
      const shielded = flagBoolean(flags, "shielded");
      const outPath = flagString(flags, "out") ?? "reports/results.jsonl";
      const reportPath = flagString(flags, "report");
      return runAttack({ demo, agentPath, repoUrl, repoEntry, shielded, outPath, reportPath });
    }
    case "score": {
      const inPath = positionals[0];
      if (!inPath) {
        console.error("arka score: pass a results.jsonl path");
        return 1;
      }
      return runScore({ inPath, agentName: flagString(flags, "agent-name") });
    }
    case "report": {
      const inPath = positionals[0];
      const outPath = flagString(flags, "out");
      if (!inPath || !outPath) {
        console.error("arka report: usage: arka report <results.jsonl> --out <report.html>");
        return 1;
      }
      return runReport({ inPath, outPath, agentName: flagString(flags, "agent-name") });
    }
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
  });
