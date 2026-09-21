/**
 * Runs the next pending live-model corpus pass, and only that one.
 *
 * The free model tier allows 50 requests a day across ALL free models, and a
 * full 16-vector pass costs 32 (clean and attacked, per vector). So a series
 * of passes has to be spread across days, one per invocation. This script
 * holds the series as a fixed list and runs the first entry whose log does not
 * exist yet — progress is the files on disk, not a date, so a missed day just
 * shifts the rest back instead of skipping a run.
 *
 * Two guards, both there because the failure they prevent is silent:
 *
 *   - QUOTA. A pass started without enough quota runs out part-way. Every
 *     call after that fails, and the runner records a failed decision as
 *     `hold` — which the scorer counts as "held". A half-starved run
 *     therefore produces a flattering grade, not an error. So the pass does
 *     not start unless the whole of it can be paid for.
 *   - ERRORS. For the same reason, a finished pass with ANY errored decision
 *     is not accepted. It is kept beside the series as `.failed` for
 *     inspection and the entry stays pending, so the next invocation retries.
 *
 * Runs of different models are separate subjects, never repeats of each
 * other: each entry names its model, and a range is only ever computed within
 * one model.
 *
 *   node scripts/llm-series.mjs            run the next pending pass
 *   node scripts/llm-series.mjs --status   show the series, run nothing
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const NEX = "nex-agi/nex-n2.5-pro:free";
const LING = "inclusionai/ling-3.0-flash-vl:free";

/** In run order. The first entry without a log is the one that runs. */
const SERIES = [
  { model: LING, shielded: false, out: "reports/llm-ling-unshielded-run1.jsonl" },
  { model: LING, shielded: true, out: "reports/llm-ling-shielded-run1.jsonl" },
  { model: NEX, shielded: false, out: "reports/llm-unshielded-run2.jsonl" },
  { model: NEX, shielded: true, out: "reports/llm-shielded-run2.jsonl" },
];

const CALLS_PER_PASS = 32;
/** Headroom for the client's retries, which also draw on the quota. */
const QUOTA_MARGIN = 6;
const LOG = "reports/llm-series.log";

function log(line) {
  const stamped = `${new Date().toISOString()}  ${line}`;
  console.log(stamped);
  appendFileSync(LOG, `${stamped}\n`, "utf8");
}

function label(entry) {
  return `${entry.model} ${entry.shielded ? "shielded" : "unshielded"}`;
}

function readRows(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function freeQuotaRemaining() {
  const key = process.env.HEYARKA_LLM_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("no OPENROUTER_API_KEY or HEYARKA_LLM_API_KEY in the environment");
  const response = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`quota check failed: HTTP ${response.status}`);
  const body = await response.json();
  const remaining = body?.data?.free_model_daily_requests?.remaining;
  if (typeof remaining !== "number") throw new Error("quota check returned no free-request count");
  return remaining;
}

if (process.argv.includes("--status")) {
  for (const entry of SERIES) {
    let state = "pending";
    if (existsSync(entry.out)) {
      const rows = readRows(entry.out);
      const hit = rows.filter((r) => r.succeeded).length;
      state = `done  ${hit}/${rows.length} succeeded (${((hit / rows.length) * 100).toFixed(1)}%)`;
    }
    console.log(`${label(entry).padEnd(52)} ${state}`);
  }
  process.exit(0);
}

const next = SERIES.find((entry) => !existsSync(entry.out));
if (!next) {
  console.log("Series complete; nothing to run.");
  process.exit(0);
}

let remaining;
try {
  remaining = await freeQuotaRemaining();
} catch (error) {
  log(`SKIP  ${label(next)}: ${error.message}`);
  process.exit(1);
}

const needed = CALLS_PER_PASS + QUOTA_MARGIN;
if (remaining < needed) {
  log(`SKIP  ${label(next)}: ${remaining} free requests left, a pass needs ${needed}`);
  process.exit(0);
}

const tmp = `${next.out}.partial`;
rmSync(tmp, { force: true });

log(`START ${label(next)} (${remaining} free requests available)`);

const args = [
  "packages/cli/dist/bin.js",
  "attack",
  "--agent",
  "packages/llm-agent/dist/entry.js",
  "--out",
  tmp,
];
if (next.shielded) args.push("--shielded");

const run = spawnSync(process.execPath, args, {
  env: { ...process.env, HEYARKA_LLM_MODEL: next.model },
  encoding: "utf8",
  timeout: 30 * 60 * 1000,
});

if (run.status !== 0 || !existsSync(tmp)) {
  log(`FAIL  ${label(next)}: CLI exited ${run.status}; ${(run.stderr || "").trim().slice(0, 200)}`);
  process.exit(1);
}

const rows = readRows(tmp);
const errored = rows.filter((r) => r.errorMessage);

if (rows.length !== 16 || errored.length > 0) {
  const failed = `${next.out}.failed-${Date.now()}`;
  renameSync(tmp, failed);
  log(
    `REJECT ${label(next)}: ${rows.length} rows, ${errored.length} errored ` +
      `(${errored.map((r) => r.vectorId).join(", ") || "none"}) -> kept as ${failed}, will retry`,
  );
  process.exit(1);
}

renameSync(tmp, next.out);
const hit = rows.filter((r) => r.succeeded);
log(
  `DONE  ${label(next)}: ${hit.length}/16 succeeded ` +
    `(${((hit.length / 16) * 100).toFixed(1)}%) [${hit.map((r) => r.vectorId).join(", ")}] -> ${next.out}`,
);
