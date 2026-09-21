/**
 * A minimal OpenAI-compatible chat-completions client.
 *
 * Written by hand rather than pulled from a vendor SDK because the surface
 * actually needed here is one POST, and a first-party client keeps this
 * package installable with no third-party dependency — the same reasoning
 * that produced `BitgetDemoClient` in `@heyarka/canary`. It also keeps the
 * endpoint configurable, which is the point: the same agent can be pointed at
 * Bitget's hackathon Qwen endpoint, OpenRouter, or any other OpenAI-shaped
 * gateway without a code change.
 *
 * The API key is read from configuration, sent in the Authorization header,
 * and never logged, never returned, and never placed in an error message —
 * error text from this module is safe to write into the JSONL audit log.
 */

export interface LlmClientConfig {
  /** Base URL including the version segment, e.g. https://openrouter.ai/api/v1 */
  baseUrl: string;
  model: string;
  apiKey: string;
  /** Per-request ceiling in milliseconds. */
  timeoutMs?: number;
  /** Attempts on a retryable failure, including the first. */
  maxAttempts?: number;
  /**
   * Completion-token ceiling.
   *
   * Not optional in practice. Omitting it makes some gateways reserve the
   * model's entire context window against the caller's balance — observed
   * here as an HTTP 402 quoting a 65,536-token request for what is a
   * two-line JSON answer. A trading decision needs room for the reasoning
   * pass plus a short object, not a context window.
   */
  maxTokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  text: string;
  /** The model id the gateway actually served, which may differ from the one requested. */
  servedModel: string;
  promptTokens?: number;
  completionTokens?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;
/** Enough for a reasoning pass plus the JSON order; measured against qwen3.8 at ~46-300 reasoning tokens. */
const DEFAULT_MAX_TOKENS = 1200;

/** Transport or upstream failure. Carries no credential material. */
export class LlmRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LlmRequestError";
  }
}

/**
 * Rate limits and gateway hiccups are expected across a corpus run, which
 * issues dozens of sequential calls. A 429 mid-run would otherwise be
 * recorded as an agent crash and scored as a decision, so it is retried;
 * a 400 or 401 is a configuration fault and is not.
 */
function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class LlmClient {
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly maxTokens: number;

  constructor(private readonly config: LlmClientConfig) {
    if (!config.apiKey) throw new Error("LlmClient requires an API key");
    if (!config.baseUrl) throw new Error("LlmClient requires a base URL");
    if (!config.model) throw new Error("LlmClient requires a model id");
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  get model(): string {
    return this.config.model;
  }

  async complete(messages: ChatMessage[], temperature = 0): Promise<CompletionResult> {
    const url = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            temperature,
            max_tokens: this.maxTokens,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          // The body may echo request details; only the status and a short
          // excerpt are surfaced, and never the Authorization header.
          const excerpt = (await response.text().catch(() => "")).slice(0, 300);
          const error = new LlmRequestError(
            `chat completion failed with HTTP ${response.status}: ${excerpt}`,
            response.status,
          );
          if (isRetryable(response.status) && attempt < this.maxAttempts) {
            lastError = error;
            await sleep(attempt * 1500);
            continue;
          }
          throw error;
        }

        const body = (await response.json()) as {
          model?: string;
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
          error?: { message?: string };
        };

        if (body.error) {
          throw new LlmRequestError(`gateway returned an error: ${body.error.message ?? "unknown"}`);
        }

        const text = body.choices?.[0]?.message?.content;
        if (typeof text !== "string" || text.trim().length === 0) {
          // An empty completion is retryable: it is usually a truncated
          // stream rather than a decision to say nothing.
          const error = new LlmRequestError("model returned an empty completion");
          if (attempt < this.maxAttempts) {
            lastError = error;
            await sleep(attempt * 1500);
            continue;
          }
          throw error;
        }

        return {
          text,
          servedModel: body.model ?? this.config.model,
          promptTokens: body.usage?.prompt_tokens,
          completionTokens: body.usage?.completion_tokens,
        };
      } catch (error) {
        const err = error as Error;
        if (err.name === "AbortError") {
          const timeout = new LlmRequestError(`request timed out after ${this.timeoutMs}ms`);
          if (attempt < this.maxAttempts) {
            lastError = timeout;
            await sleep(attempt * 1500);
            continue;
          }
          throw timeout;
        }
        if (err instanceof LlmRequestError) throw err;
        // Network-level failure: retry within budget.
        if (attempt < this.maxAttempts) {
          lastError = err;
          await sleep(attempt * 1500);
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new LlmRequestError("chat completion failed after all attempts");
  }
}
