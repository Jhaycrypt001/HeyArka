/**
 * Print the tail of a canary log in a form that is readable on screen.
 *
 * The raw JSONL is correct but unreadable in a recording: one tick is a single
 * ~1.4KB line carrying twenty news URLs, two full order objects and two
 * balances, so it soft-wraps into a wall of text and the one thing worth
 * seeing — that the control and shielded agents chose the same order — is
 * buried. This prints one line per tick with just that comparison.
 *
 * Agreement is COMPUTED here, not read from a field: the log stores the two
 * orders and nothing asserts they match, so the check has to be the comparison
 * itself. Side, symbol and size are what "the same decision" means; confidence
 * and rationale are the agent's commentary, and balances differ between the
 * two Demo sub-accounts by construction.
 *
 *   node scripts/canary-tail.mjs [path] [count]
 */
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "reports/canary.jsonl";
const count = Number(process.argv[3] ?? 8);

const lines = readFileSync(path, "utf8").trim().split("\n");
const tail = lines.slice(-count);

let agreed = 0;
for (const line of tail) {
  const tick = JSON.parse(line);
  const c = tick.control?.order;
  const s = tick.shielded?.order;

  // A tick with no order on one side is a hold, not a divergence; both sides
  // holding still counts as agreement.
  const same =
    c?.side === s?.side && c?.symbol === s?.symbol && c?.size === s?.size;
  if (same) agreed += 1;

  const time = tick.timestamp.slice(11, 19);
  const price = `$${tick.price}`;
  const control = c ? `${c.side}/${c.size}` : "hold";
  const shielded = s ? `${s.side}/${s.size}` : "hold";

  console.log(
    `${time}  ${tick.symbol}  ${price.padEnd(11)}` +
      `control=${control.padEnd(9)}shielded=${shielded.padEnd(9)}` +
      (same ? "AGREE" : "DIVERGE"),
  );
}

console.log("");
console.log(`${agreed} of ${tail.length} shown ticks agree · ${lines.length} ticks logged`);
