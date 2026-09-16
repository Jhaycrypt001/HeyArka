/**
 * Loads a real, third-party `AgentUnderTest` from a user-supplied module path
 * for `arka attack --agent <path>`. No demo fallback lives here: if the
 * module doesn't resolve or doesn't export a usable agent, this throws with
 * a specific, actionable message rather than silently substituting anything.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { AgentUnderTest } from "@heyarka/core";

function isAgentUnderTest(value: unknown): value is AgentUnderTest {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as { name: unknown }).name === "string" &&
    "decide" in value &&
    typeof (value as { decide: unknown }).decide === "function"
  );
}

/**
 * Imports `modulePath` and returns its `AgentUnderTest`. Accepts a default
 * export, a named `agent` export, or a factory function under either of
 * those names (called with no arguments) — covers the common shapes of an
 * existing agent module without guessing at anything riskier.
 */
export async function loadAgent(modulePath: string): Promise<AgentUnderTest> {
  const absolute = resolve(process.cwd(), modulePath);
  const mod: Record<string, unknown> = await import(pathToFileURL(absolute).href);

  const candidates = [mod.default, mod.agent, mod.createAgent, mod.default_];
  for (const candidate of candidates) {
    if (isAgentUnderTest(candidate)) return candidate;
    if (typeof candidate === "function") {
      const produced: unknown = await candidate();
      if (isAgentUnderTest(produced)) return produced;
    }
  }

  throw new Error(
    `${modulePath} does not export a usable AgentUnderTest. ` +
      `Export a default (or named "agent") object shaped { name: string; decide(ctx): Promise<ProposedOrder> }, ` +
      `or a zero-argument factory function that returns one.`,
  );
}
