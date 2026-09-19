import { defineConfig } from "vitest/config";

/**
 * These tests spawn real subprocesses — `load-repo-agent.test.ts` shells out to
 * `git` to clone a fixture repo — and the 5s default is not enough for that
 * when the root `pnpm -r test` runs all five packages at once. The work is
 * process startup and I/O, not computation, so under that load a clone that
 * takes ~500ms alone can take several seconds, and the suite failed
 * intermittently in a way that had nothing to do with the code under test.
 *
 * Raised rather than serialised because the parallelism is worth keeping and a
 * generous ceiling costs nothing on a passing run: a test that genuinely hangs
 * still fails, just later.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
