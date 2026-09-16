import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAgent } from "./load-agent.js";

const tempDirs: string[] = [];

async function writeModule(contents: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "heyarka-cli-test-"));
  tempDirs.push(dir);
  const path = join(dir, "agent.mjs");
  await writeFile(path, contents, "utf8");
  return path;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("loadAgent", () => {
  it("loads a real module with a default export object", async () => {
    const path = await writeModule(`
      export default {
        name: "default-export-agent",
        async decide(ctx) { return { side: "hold", symbol: ctx.symbol, size: 0 }; },
      };
    `);
    const agent = await loadAgent(path);
    expect(agent.name).toBe("default-export-agent");
    const order = await agent.decide({ asOf: "2026-01-01T00:00:00.000Z", symbol: "TSLA", price: 1, news: [] });
    expect(order.side).toBe("hold");
  });

  it("loads a real module with a named 'agent' export", async () => {
    const path = await writeModule(`
      export const agent = {
        name: "named-export-agent",
        async decide(ctx) { return { side: "buy", symbol: ctx.symbol, size: 10 }; },
      };
    `);
    const agent = await loadAgent(path);
    expect(agent.name).toBe("named-export-agent");
  });

  it("calls a zero-argument factory function export to produce the agent", async () => {
    const path = await writeModule(`
      export default function createAgent() {
        return {
          name: "factory-agent",
          async decide(ctx) { return { side: "hold", symbol: ctx.symbol, size: 0 }; },
        };
      }
    `);
    const agent = await loadAgent(path);
    expect(agent.name).toBe("factory-agent");
  });

  it("throws a specific, actionable error for a module with no usable export", async () => {
    const path = await writeModule(`export const somethingElse = 42;`);
    await expect(loadAgent(path)).rejects.toThrow(/does not export a usable AgentUnderTest/);
  });

  it("propagates a real import error for a nonexistent module", async () => {
    await expect(loadAgent("./definitely-does-not-exist.mjs")).rejects.toThrow();
  });
});
