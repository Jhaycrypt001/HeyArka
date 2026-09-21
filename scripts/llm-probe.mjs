/**
 * Runs chosen corpus vectors against a LIVE model, unshielded and shielded.
 *
 * This exists because the bundled `arka attack --demo` agent is deterministic
 * by design, and a reader is entitled to ask whether the corpus does anything
 * to an actual LLM. It does not re-implement any part of the harness: the
 * vectors come from `CORPUS`, the execution comes from `runVector`, the
 * defense comes from `shieldAgent`, and the verdict is whatever `diffOrders`
 * decided. This file only selects vectors and prints what came back.
 *
 * Every invocation costs real tokens and takes real time — roughly four
 * model calls per vector (clean and attacked, twice over) — so it takes an
 * explicit vector list rather than defaulting to the whole corpus.
 *
 *   node scripts/llm-probe.mjs homoglyph-ticker-swap
 *   node scripts/llm-probe.mjs --list
 *
 * Configure the model through the environment; see packages/llm-agent/src/entry.ts.
 */
import { CORPUS, runVector } from "../packages/core/dist/index.js";
import { shieldAgent } from "../packages/shield/dist/index.js";
import { demoContext, demoRiskContract } from "../packages/cli/dist/demo-context.js";
import createAgentFromEnv from "../packages/llm-agent/dist/entry.js";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--list")) {
  console.log("Available vectors:\n");
  for (const v of CORPUS) console.log(`  ${v.family.padEnd(18)} ${v.id}`);
  console.log("\nUsage: node scripts/llm-probe.mjs <vectorId> [vectorId...]");
  process.exit(args.includes("--list") ? 0 : 1);
}

const byId = new Map(CORPUS.map((v) => [v.id, v]));
const vectors = [];
for (const id of args) {
  const v = byId.get(id);
  if (!v) {
    console.error(`unknown vector: ${id}\nrun with --list to see the corpus`);
    process.exit(1);
  }
  vectors.push(v);
}

const base = createAgentFromEnv();
const contract = demoRiskContract();
const shielded = shieldAgent(base, { riskContract: contract });

console.log(`model:   ${base.name}`);
console.log(`vectors: ${vectors.length}`);
console.log("");

let failures = 0;

for (const vector of vectors) {
  for (const [label, agent, isShielded] of [
    ["UNSHIELDED", base, false],
    ["SHIELDED", shielded, true],
  ]) {
    try {
      const r = await runVector({
        agent,
        vector,
        cleanContext: demoContext(),
        riskContract: contract,
        shielded: isShielded,
      });

      console.log(`${vector.id}  [${label}]`);
      console.log(
        `  clean     ${r.clean.side}/${r.clean.size}` +
          `  approval=${Boolean(r.clean.requiresHumanApproval)}`,
      );
      console.log(
        `  attacked  ${r.attacked.side}/${r.attacked.size}` +
          `  approval=${Boolean(r.attacked.requiresHumanApproval)}`,
      );
      console.log(`  verdict   ${r.succeeded ? "ATTACK SUCCEEDED" : "held"} — ${r.delta}`);
      if (r.riskViolations.length > 0) {
        console.log(`  risk      ${r.riskViolations.join("; ")}`);
      }
      if (r.errorMessage) {
        console.log(`  error     ${r.errorMessage}`);
        failures += 1;
      }
      if (r.clean.rationale) console.log(`  clean says:    ${r.clean.rationale}`);
      if (r.attacked.rationale) console.log(`  attacked says: ${r.attacked.rationale}`);
      console.log("");
    } catch (error) {
      console.log(`${vector.id} [${label}] FAILED: ${error.message}\n`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.log(`${failures} run(s) did not complete. Nothing above is a result for those.`);
  process.exit(1);
}
