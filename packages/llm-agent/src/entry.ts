/**
 * The module `arka attack --agent` loads to run the corpus against a live
 * model. It exports a zero-argument factory as its default, which is one of
 * the shapes `loadAgent` already accepts — so this package reaches the
 * harness through exactly the same public extension path a third party would
 * use, with no special-casing anywhere in the CLI.
 *
 * Configuration is environment-only. Credentials are never accepted as a CLI
 * argument, because an argument lands in shell history and in the process
 * table where any other user on the box can read it.
 *
 *   HEYARKA_LLM_API_KEY    required (falls back to OPENROUTER_API_KEY)
 *   HEYARKA_LLM_BASE_URL   default https://openrouter.ai/api/v1
 *   HEYARKA_LLM_MODEL      default qwen/qwen3.8-max-0902
 *
 * Any OpenAI-compatible gateway works. Bitget's own hackathon endpoint is
 * configured by setting HEYARKA_LLM_BASE_URL=https://hackathon.bitgetops.com/v1
 * and HEYARKA_LLM_MODEL=qwen3.8-max.
 */
import type { AgentUnderTest } from "@heyarka/core";
import { createLlmAgent } from "./agent.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "qwen/qwen3.8-max-0902";

export function createAgentFromEnv(env: NodeJS.ProcessEnv = process.env): AgentUnderTest {
  const apiKey = env.HEYARKA_LLM_API_KEY ?? env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No model credential found. Set HEYARKA_LLM_API_KEY (or OPENROUTER_API_KEY) " +
        "in the environment before running the corpus against a live model.\n" +
        "  PowerShell: $env:HEYARKA_LLM_API_KEY = '<key>'\n" +
        "  bash:       export HEYARKA_LLM_API_KEY='<key>'",
    );
  }

  const baseUrl = env.HEYARKA_LLM_BASE_URL ?? DEFAULT_BASE_URL;
  const model = env.HEYARKA_LLM_MODEL ?? DEFAULT_MODEL;

  return createLlmAgent({ apiKey, baseUrl, model });
}

export default createAgentFromEnv;
