#!/usr/bin/env node
/**
 * `heyarka-canary run` — starts the live A/B loop against real Bitget Demo
 * accounts. Credentials come only from the environment (see credentials.ts);
 * there is no flag to pass a key on the command line, so one never ends up
 * in shell history or a process list.
 */
import { loadCredentialsFromEnv } from "./credentials.js";
import { createSentimentAgent } from "./sentiment-agent.js";
import { runLoop } from "./loop.js";

const HELP = `heyarka-canary — live Bitget Demo A/B canary (control vs @heyarka/shield)

Usage:
  heyarka-canary run [options]
  heyarka-canary help

Options:
  --symbol <sym>       Trading pair to trade, e.g. BTCUSDT (default: BTCUSDT)
  --log <path>         JSONL log path (default: reports/canary.jsonl)
  --interval-ms <ms>   Delay between ticks (default: 900000 = 15 min)
  --ticks <n>          Stop after n ticks (default: run until stopped)
  --notional <usdt>    Base order notional per decisive signal (default: 15)
  --max-notional <usdt> Cap on any single order (default: 50)
  --dry-run            Score decisions without placing real orders

Requires these environment variables (see README):
  BITGET_DEMO_CONTROL_API_KEY / _API_SECRET / _API_PASSPHRASE
  BITGET_DEMO_SHIELDED_API_KEY / _API_SECRET / _API_PASSPHRASE
`;

function flagValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (command === undefined || command === "help" || argv.includes("--help")) {
    process.stdout.write(HELP);
    return 0;
  }

  if (command !== "run") {
    process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
    return 1;
  }

  const symbol = flagValue(argv, "--symbol") ?? "BTCUSDT";
  const logPath = flagValue(argv, "--log") ?? "reports/canary.jsonl";
  const intervalMs = Number(flagValue(argv, "--interval-ms") ?? "900000");
  const ticksArg = flagValue(argv, "--ticks");
  const maxTicks = ticksArg !== undefined ? Number(ticksArg) : undefined;
  const baseNotional = Number(flagValue(argv, "--notional") ?? "15");
  const maxNotional = Number(flagValue(argv, "--max-notional") ?? "50");
  const placeOrders = !argv.includes("--dry-run");

  /*
   * Refuse to run with TLS verification disabled.
   *
   * This process signs every request with real Bitget API credentials. With
   * NODE_TLS_REJECT_UNAUTHORIZED=0, Node accepts any certificate, so anything
   * able to intercept the connection can present its own and read those
   * credentials in flight. A Demo account is still an account.
   *
   * It is a hard exit rather than a warning because the variable is usually set
   * ambiently in a shell, hours earlier, for some unrelated reason — exactly the
   * case a printed warning scrolls past unread.
   */
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    process.stderr.write(
      "heyarka-canary: refusing to start — NODE_TLS_REJECT_UNAUTHORIZED=0 is set.\n" +
        "This disables certificate verification for a process that sends signed API\n" +
        "credentials to Bitget. Clear it and retry:\n" +
        "  PowerShell:  Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED\n" +
        "  bash:        unset NODE_TLS_REJECT_UNAUTHORIZED\n",
    );
    return 1;
  }

  const credentials = loadCredentialsFromEnv();
  const agent = createSentimentAgent({ baseNotional, maxNotional });

  process.stdout.write(
    `heyarka-canary: starting ${symbol} A/B loop, interval ${intervalMs}ms, ${
      maxTicks !== undefined ? `${maxTicks} ticks` : "unbounded"
    }, ${placeOrders ? "LIVE DEMO ORDERS" : "dry run (no orders placed)"}\n`,
  );

  await runLoop({
    symbol,
    credentials,
    controlAgent: agent,
    shieldedAgentBase: agent,
    riskContract: {
      maxNotionalPerTrade: maxNotional,
      allowedSymbols: [symbol],
      maxConfidence: 0.98,
      humanApprovalThreshold: maxNotional,
    },
    orderNotional: baseNotional,
    placeOrders,
    logPath,
    intervalMs,
    maxTicks,
    onTick: (tick, index) => {
      process.stdout.write(
        `[tick ${index}] ${tick.timestamp} ${tick.symbol}@${tick.price} control=${tick.control.order.side}/${tick.control.order.size} shielded=${tick.shielded.order.side}/${tick.shielded.order.size}\n`,
      );
    },
    onError: (err, index) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[tick ${index}] error: ${message}\n`);
    },
  });

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`heyarka-canary: fatal: ${message}\n`);
    process.exit(1);
  });
