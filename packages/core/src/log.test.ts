import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendResult, readResults } from "./log.js";
import type { AttackResult } from "./types.js";

function fakeResult(vectorId: string): AttackResult {
  return {
    vectorId,
    family: "homoglyph",
    agentName: "agent",
    clean: { side: "hold", symbol: "TSLA", size: 0 },
    attacked: { side: "buy", symbol: "TSLA", size: 100 },
    succeeded: true,
    delta: "side hold -> buy",
    riskViolations: [],
    shielded: false,
    timestamp: new Date().toISOString(),
  };
}

describe("JSONL log", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("reading a nonexistent file returns an empty array, not an error", async () => {
    dir = await mkdtemp(join(tmpdir(), "heyarka-log-"));
    const results = await readResults(join(dir, "missing.jsonl"));
    expect(results).toEqual([]);
  });

  it("round-trips appended results in write order", async () => {
    dir = await mkdtemp(join(tmpdir(), "heyarka-log-"));
    const path = join(dir, "reports", "run.jsonl");
    await appendResult(path, fakeResult("v1"));
    await appendResult(path, fakeResult("v2"));
    await appendResult(path, fakeResult("v3"));

    const results = await readResults(path);
    expect(results.map((r) => r.vectorId)).toEqual(["v1", "v2", "v3"]);
  });

  it("creates parent directories that do not yet exist", async () => {
    dir = await mkdtemp(join(tmpdir(), "heyarka-log-"));
    const path = join(dir, "a", "b", "c", "run.jsonl");
    await appendResult(path, fakeResult("v1"));
    const results = await readResults(path);
    expect(results).toHaveLength(1);
  });
});
