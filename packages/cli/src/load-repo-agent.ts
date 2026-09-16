/**
 * Loads a real, third-party `AgentUnderTest` from a public git repository for
 * `arka attack --repo <url> --entry <path>`. This is a thin, honest wrapper
 * around two real steps: `git clone --depth 1` into a temp directory, then
 * `loadAgent()` on the caller-specified entry module inside it.
 *
 * No repo-layout guessing lives here. A third-party repo's agent module can
 * be anywhere and shaped any way its author chose; `--entry` is required so
 * this never silently imports the wrong file or claims success on the wrong
 * module. If `--entry` doesn't resolve to a usable `AgentUnderTest`,
 * `loadAgent`'s own specific error surfaces unchanged.
 *
 * This only clones and imports code — it never pushes, opens issues, or
 * otherwise contacts the source repo, and it runs entirely against the
 * cloned copy on local disk.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { AgentUnderTest } from "@heyarka/core";
import { loadAgent } from "./load-agent.js";

function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

export interface LoadRepoAgentResult {
  agent: AgentUnderTest;
  /** Absolute path to the shallow clone, so the caller can clean it up. */
  cloneDir: string;
}

/**
 * Shallow-clones `repoUrl` into a fresh temp directory and loads `entryPath`
 * (relative to the clone root) as an `AgentUnderTest`. The clone is left on
 * disk at the returned `cloneDir`; call `cleanupRepoClone` when done with it.
 */
export async function loadRepoAgent(repoUrl: string, entryPath: string): Promise<LoadRepoAgentResult> {
  const cloneDir = await mkdtemp(join(tmpdir(), "heyarka-repo-"));
  try {
    await run("git", ["clone", "--depth", "1", repoUrl, cloneDir]);
  } catch (err) {
    await rm(cloneDir, { recursive: true, force: true });
    throw new Error(
      `arka attack --repo: failed to clone ${repoUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const agent = await loadAgent(join(cloneDir, entryPath));
  return { agent, cloneDir };
}

export async function cleanupRepoClone(cloneDir: string): Promise<void> {
  await rm(cloneDir, { recursive: true, force: true });
}
