/**
 * Repeats `runTick` on an interval, appending each real tick to the JSONL
 * log as it completes. This is the actual daemon behind `heyarka-canary run`
 * — it is meant to run for the multi-day paper-trading window the hackathon
 * scoring rewards, not just once.
 */
import type { RunTickOptions } from "./run-tick.js";
import { runTick } from "./run-tick.js";
import { appendTick } from "./log.js";

export interface RunLoopOptions extends RunTickOptions {
  logPath: string;
  intervalMs: number;
  /** Total ticks to run before returning; omit to run until the process is stopped. */
  maxTicks?: number;
  onTick?: (tick: Awaited<ReturnType<typeof runTick>>, index: number) => void;
  onError?: (err: unknown, index: number) => void;
  /** Injectable so tests can run a real loop without real wall-clock waits. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the A/B loop until `maxTicks` is reached (or forever if omitted). A
 * single tick's failure (e.g. a transient network error) is logged via
 * `onError` and does not stop the loop — a canary that dies on the first
 * dropped connection would defeat its own purpose.
 */
export async function runLoop(options: RunLoopOptions): Promise<void> {
  const { logPath, intervalMs, maxTicks, onTick, onError, sleep = defaultSleep, ...tickOptions } = options;

  for (let i = 0; maxTicks === undefined || i < maxTicks; i++) {
    try {
      const tick = await runTick(tickOptions);
      await appendTick(logPath, tick);
      onTick?.(tick, i);
    } catch (err) {
      onError?.(err, i);
    }

    const isLast = maxTicks !== undefined && i === maxTicks - 1;
    if (!isLast) await sleep(intervalMs);
  }
}
