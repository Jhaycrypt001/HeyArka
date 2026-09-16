/**
 * Re-derives every canary figure published on the site and in the README
 * straight from reports/canary.jsonl.
 *
 * The canary keeps ticking, so these numbers move. Run this before submitting
 * and copy the output into apps/desk/src/lib/facts.ts (CANARY) so the page
 * never claims a figure the log does not support.
 *
 *   node scripts/canary-figures.mjs
 */
import { readFileSync } from "node:fs";

const LOG = "reports/canary.jsonl";

const ticks = readFileSync(LOG, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line));

if (ticks.length === 0) {
  console.error(`${LOG} has no ticks.`);
  process.exit(1);
}

const first = new Date(ticks[0].timestamp);
const last = new Date(ticks[ticks.length - 1].timestamp);
const spanHours = ((last - first) / 3_600_000).toFixed(1);

// The order-id field is `placedOrderId`. A tick with no id is a deliberate
// hold, not a failure, so it counts toward ticks but not toward orders.
const ordersPlaced = ticks.filter((t) => t.control?.placedOrderId).length;
const agreed = ticks.filter((t) => t.control?.order?.side === t.shielded?.order?.side).length;
const diverged = ticks.length - agreed;

const staleMin = ((Date.now() - last) / 60_000).toFixed(0);

/*
 * A credential must never reach this log. Re-checked on every run rather than
 * once at commit time, because the log grows after the audit that cleared it.
 */
const fields = new Set();
const walk = (obj, prefix = "") => {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      fields.add(prefix + key);
      walk(obj[key], `${prefix}${key}.`);
    }
  }
};
for (const tick of ticks) walk(tick);
const credentialShaped = [...fields].filter((f) =>
  /key|secret|pass|token|cred|sign|apikey|passphrase/i.test(f),
);

console.log(`
CANARY = {
  ticks: ${ticks.length},
  spanHours: ${spanHours},
  ordersPlaced: ${ordersPlaced},
  agreementRate: "${agreed} of ${ticks.length}",
}

  divergences      ${diverged}${diverged > 0 ? "  <-- a divergence exists: the PnL claim can change" : ""}
  last tick        ${staleMin} min ago${staleMin > 30 ? "  <-- STALE, the daemon may have stopped" : ""}
  credential scan  ${credentialShaped.length === 0 ? "clean, no credential-shaped fields" : `LEAK: ${credentialShaped.join(", ")}`}
`);

if (credentialShaped.length > 0) process.exit(1);
