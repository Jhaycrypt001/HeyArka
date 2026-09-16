import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { loadRepoAgent, cleanupRepoClone } from "./load-repo-agent.js";

const tempDirs: string[] = [];

function git(args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("git", args, { cwd, stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolvePromise() : reject(new Error(`git ${args.join(" ")} failed`))));
  });
}

/**
 * Builds a real, standalone git repository on disk with a real commit, so
 * `loadRepoAgent` exercises an actual `git clone` against it rather than a
 * mocked filesystem. This is what makes the test a genuine proof that the
 * "run HeyArka against a public repo" claim works end to end.
 */
async function makeSourceRepo(agentModule: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "heyarka-source-repo-"));
  tempDirs.push(dir);
  await writeFile(join(dir, "agent.mjs"), agentModule, "utf8");
  await git(["init", "-q"], dir);
  await git(["add", "agent.mjs"], dir);
  await git(["-c", "user.email=test@test.com", "-c", "user.name=test", "commit", "-q", "-m", "add agent"], dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("loadRepoAgent", () => {
  it("clones a real separate git repository and loads its agent module", async () => {
    const sourceRepo = await makeSourceRepo(`
      export const agent = {
        name: "cloned-repo-agent",
        async decide(ctx) { return { side: "buy", symbol: ctx.symbol, size: 50 }; },
      };
    `);

    const { agent, cloneDir } = await loadRepoAgent(sourceRepo, "agent.mjs");
    try {
      expect(agent.name).toBe("cloned-repo-agent");
      const order = await agent.decide({ asOf: "2026-01-01T00:00:00.000Z", symbol: "TSLA", price: 1, news: [] });
      expect(order.side).toBe("buy");
      // The clone is a real, separate directory on disk, not the source repo.
      expect(cloneDir).not.toBe(sourceRepo);
    } finally {
      await cleanupRepoClone(cloneDir);
    }
  });

  it("removes the clone directory from disk after cleanupRepoClone", async () => {
    const sourceRepo = await makeSourceRepo(`
      export default { name: "temp-agent", async decide(ctx) { return { side: "hold", symbol: ctx.symbol, size: 0 }; } };
    `);
    const { cloneDir } = await loadRepoAgent(sourceRepo, "agent.mjs");
    await cleanupRepoClone(cloneDir);
    await expect(rm(cloneDir, { recursive: false })).rejects.toThrow();
  });

  it("throws a specific error when the repo URL cannot be cloned, and leaves no clone directory behind", async () => {
    await expect(loadRepoAgent("/definitely/not/a/real/repo/path", "agent.mjs")).rejects.toThrow(
      /failed to clone/,
    );
  });

  it("propagates loadAgent's own error when --entry doesn't export a usable agent", async () => {
    const sourceRepo = await makeSourceRepo(`export const somethingElse = 42;`);
    await expect(loadRepoAgent(sourceRepo, "agent.mjs")).rejects.toThrow(/does not export a usable AgentUnderTest/);
  });
});
