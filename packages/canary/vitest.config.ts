import { defineConfig } from "vitest/config";

/**
 * `tls-guard.test.ts` runs the canary binary as a real child process three
 * times to prove it refuses to start with certificate verification disabled.
 * That is the right way to test a startup guard — it has to be a real startup —
 * but it means the test's cost is process spawn time, which balloons when the
 * root `pnpm -r test` runs all five packages concurrently. Measured at ~600ms
 * per case alone and 15.9s for the file under full parallel load, against a 5s
 * default, so the suite failed intermittently on a guard that works.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
