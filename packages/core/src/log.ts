/**
 * Append-only JSONL persistence for `AttackResult`s — the audit trail
 * ARCHITECTURE.md names as the source of truth. Every scorecard must be
 * reproducible by reading this file back through `score()`; nothing about a
 * run is trustworthy unless it survives the round trip.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AttackResult } from "./types.js";

/** Appends one result as a single JSON line. Creates parent directories as needed. */
export async function appendResult(path: string, result: AttackResult): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(result)}\n`, "utf8");
}

/** Reads every result back from a JSONL file, in the order they were written. */
export async function readResults(path: string): Promise<AttackResult[]> {
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
    .map((line) => JSON.parse(line) as AttackResult);
}
