import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readResults } from "@heyarka/core";
import { runAttack, runScore, runReport } from "./commands.js";

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "heyarka-cli-cmd-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("runAttack", () => {
  it("runs the real corpus against the demo agent and writes a genuine JSONL log", async () => {
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    const code = await runAttack({ demo: true, shielded: false, outPath, reportPath: undefined });
    expect(code).toBe(0);

    const results = await readResults(outPath);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.agentName === "heyarka-demo-agent")).toBe(true);
    // at least one real attack succeeds against the naive bundled agent
    expect(results.some((r) => r.succeeded)).toBe(true);
  });

  it("wraps the demo agent in the real shield when --shielded is passed", async () => {
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    const code = await runAttack({ demo: true, shielded: true, outPath, reportPath: undefined });
    expect(code).toBe(0);
    const results = await readResults(outPath);
    expect(results.every((r) => r.agentName === "heyarka-demo-agent+shield")).toBe(true);
    expect(results.every((r) => r.shielded)).toBe(true);
  });

  it("also writes a real HTML report file when --report is passed", async () => {
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    const reportPath = join(dir, "report.html");
    await runAttack({ demo: true, shielded: false, outPath, reportPath });
    const html = await readFile(reportPath, "utf8");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("fails with a clear error when neither --demo nor --agent is given", async () => {
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    const code = await runAttack({ demo: false, shielded: false, outPath, reportPath: undefined });
    expect(code).toBe(1);
    await expect(access(outPath)).rejects.toThrow();
  });
});

describe("runScore and runReport", () => {
  it("recompute an identical scorecard from a log written by runAttack", async () => {
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    await runAttack({ demo: true, shielded: false, outPath, reportPath: undefined });

    expect(await runScore({ inPath: outPath })).toBe(0);

    const reportPath = join(dir, "recomputed.html");
    expect(await runReport({ inPath: outPath, outPath: reportPath })).toBe(0);
    const html = await readFile(reportPath, "utf8");
    expect(html).toContain("heyarka-demo-agent");
  });

  it("fails cleanly when the log file has no results", async () => {
    const dir = await tempDir();
    const missing = join(dir, "nope.jsonl");
    expect(await runScore({ inPath: missing })).toBe(1);
    expect(await runReport({ inPath: missing, outPath: join(dir, "out.html") })).toBe(1);
  });

  it("scores only the requested agent's rows when a log holds more than one agent", async () => {
    // arka attack defaults to appending to the same --out path, so a log
    // commonly ends up with both an unshielded and a shielded run in it.
    // score/report must not silently blend them into one number.
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    await runAttack({ demo: true, shielded: false, outPath, reportPath: undefined });
    await runAttack({ demo: true, shielded: true, outPath, reportPath: undefined });

    const allResults = await readResults(outPath);
    const unshieldedCount = allResults.filter((r) => r.agentName === "heyarka-demo-agent").length;
    const shieldedCount = allResults.filter((r) => r.agentName === "heyarka-demo-agent+shield").length;
    expect(unshieldedCount).toBeGreaterThan(0);
    expect(shieldedCount).toBeGreaterThan(0);

    const reportPath = join(dir, "shielded-only.html");
    expect(
      await runReport({ inPath: outPath, outPath: reportPath, agentName: "heyarka-demo-agent+shield" }),
    ).toBe(0);
    const html = await readFile(reportPath, "utf8");
    // The rendered totalVectors count must match only the shielded rows,
    // proving the unshielded rows in the same log were excluded rather than
    // blended in.
    expect(html).toContain(`${shieldedCount} vectors run`);
    expect(html).not.toContain(`${allResults.length} vectors run`);
  });

  it("fails with a clear error when the requested agent has no rows in the log", async () => {
    const dir = await tempDir();
    const outPath = join(dir, "results.jsonl");
    await runAttack({ demo: true, shielded: false, outPath, reportPath: undefined });

    expect(await runScore({ inPath: outPath, agentName: "nonexistent-agent" })).toBe(1);
    expect(
      await runReport({ inPath: outPath, outPath: join(dir, "out.html"), agentName: "nonexistent-agent" }),
    ).toBe(1);
  });
});
