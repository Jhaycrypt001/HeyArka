import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);

/**
 * The TLS guard is exercised as a subprocess rather than by importing `main`.
 *
 * bin.ts self-executes on import and calls process.exit, so importing it into a
 * test runner would terminate the runner. Spawning it is also the honest test:
 * the guard exists to stop a real invocation, and this is a real invocation.
 */
const BIN = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "dist",
  "bin.js",
);

/**
 * Credentials are deliberately absent from these environments. The guard must
 * fire before `loadCredentialsFromEnv()` is reached, so a run that is unsafe for
 * two independent reasons still reports the TLS one — the reason that would
 * otherwise put real keys on an unverified connection.
 */
async function runBin(env: NodeJS.ProcessEnv): Promise<{ code: number; stderr: string }> {
  /*
   * The child gets only PATH and what the caller passes — never the full
   * parent environment. If it inherited this machine's real BITGET_DEMO_*
   * credentials, the "verification enabled" case below would sail past the
   * credential check and start an actual 15-minute order loop from a test run.
   */
  try {
    const { stderr } = await run(process.execPath, [BIN, "run"], {
      env: { PATH: process.env.PATH, ...env },
    });
    return { code: 0, stderr };
  } catch (error) {
    const err = error as { code?: number; stderr?: string };
    return { code: err.code ?? 1, stderr: err.stderr ?? "" };
  }
}

describe("TLS guard", () => {
  it("refuses to start when certificate verification is disabled", async () => {
    const { code, stderr } = await runBin({ NODE_TLS_REJECT_UNAUTHORIZED: "0" });

    expect(code).toBe(1);
    expect(stderr).toContain("NODE_TLS_REJECT_UNAUTHORIZED=0");
    expect(stderr).toContain("refusing to start");
  });

  it("fires before the credential check, so the TLS reason is the one reported", async () => {
    const { stderr } = await runBin({ NODE_TLS_REJECT_UNAUTHORIZED: "0" });

    // Not "Missing required Bitget Demo credential environment variable(s)".
    expect(stderr).not.toContain("Missing required");
  });

  it("does not block a run when verification is left enabled", async () => {
    const { code, stderr } = await runBin({ NODE_TLS_REJECT_UNAUTHORIZED: "1" });

    // It still refuses — for the credential reason, which is the correct one
    // here. What matters is that the TLS guard is not what stopped it.
    expect(code).toBe(1);
    expect(stderr).not.toContain("NODE_TLS_REJECT_UNAUTHORIZED=0");
  });
});
