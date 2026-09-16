/**
 * Append-only JSONL persistence for `CanaryTick`s, mirroring
 * `@heyarka/core`'s log discipline: every tick this loop produces is
 * appended as one line, immediately, so a crash mid-run never loses history
 * and the nightly PnL comparison the hackathon submission needs is always
 * reproducible straight from the log file.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CanaryTick } from "./types.js";

export async function appendTick(path: string, tick: CanaryTick): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(tick)}\n`, "utf8");
}

export async function readTicks(path: string): Promise<CanaryTick[]> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }

  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as CanaryTick);
}
