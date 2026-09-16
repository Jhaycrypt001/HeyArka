/**
 * Assembles the MCP server: registers every tool in tools.ts against a real
 * McpServer instance. Kept separate from bin.ts so tests can construct a
 * server and drive it without going through stdio.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listAttackVectors,
  listAttackVectorsInput,
  applyAttackVector,
  applyAttackVectorInput,
  shieldContext,
  shieldContextInput,
  checkRiskContractTool,
  checkRiskContractInput,
  scoreResultsTool,
  scoreResultsInput,
} from "./tools.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "heyarka", version: "0.1.0" });

  server.registerTool(
    "list_attack_vectors",
    {
      title: "List HeyArka attack vectors",
      description:
        "Lists every vector in the HeyArka attack corpus (homoglyph, hidden-text, tool-hijack, semantic-trap, look-ahead, sentiment-filter families) with its id, description, expected effect, and academic citation where one applies.",
      inputSchema: listAttackVectorsInput,
    },
    async () => listAttackVectors(),
  );

  server.registerTool(
    "apply_attack_vector",
    {
      title: "Apply one attack vector to a market context",
      description:
        "Transforms a clean MarketContext into an attacked one using a named vector from list_attack_vectors — e.g. injecting a homoglyph-spoofed ticker or a zero-width hidden clause into a headline. Returns the attacked context; run your own agent's decide() on both the clean and attacked context yourself to see whether the attack changed its order.",
      inputSchema: applyAttackVectorInput,
    },
    async (args) => applyAttackVector(args),
  );

  server.registerTool(
    "shield_context",
    {
      title: "Run the HeyArka shield pipeline on a market context",
      description:
        "Runs the real sanitize -> corroboration-gate -> point-in-time-guard pipeline on a MarketContext and returns the cleaned context plus a full audit trail of what each layer changed. Use this to see what an agent would actually be shown after hardening, before wiring the shield into your own agent.",
      inputSchema: shieldContextInput,
    },
    async (args) => shieldContext(args),
  );

  server.registerTool(
    "check_risk_contract",
    {
      title: "Check a proposed order against a deterministic risk contract",
      description:
        "Runs HeyArka's non-LLM risk-contract check against a single ProposedOrder — the same deterministic veto layer the shield enforces after an agent decides. Never reads prose; only checks notional, allowed symbols, confidence, and human-approval requirements.",
      inputSchema: checkRiskContractInput,
    },
    async (args) => checkRiskContractTool(args),
  );

  server.registerTool(
    "score_results",
    {
      title: "Score a batch of AttackResults into a Scorecard",
      description:
        "Aggregates AttackResults you produced by running the corpus against your own agent (clean/attacked decide() calls, diffed) into a Scorecard: injection susceptibility rate, risk-violation rate, decision consistency, look-ahead contamination score, human-takeover rate, and a letter grade. Does not run your agent for you — supply the results.",
      inputSchema: scoreResultsInput,
    },
    async (args) => scoreResultsTool(args),
  );

  return server;
}
