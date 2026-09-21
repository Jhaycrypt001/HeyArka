/**
 * Turns a model's raw text reply into a `ProposedOrder`.
 *
 * This is a separate, pure module for one reason: it is the only part of an
 * LLM agent that can be tested without spending money or depending on the
 * network, and it is where the interesting failures live. A model asked for
 * JSON returns JSON *most* of the time — and the rest of the time it returns
 * JSON inside a ```json fence, or after a sentence of preamble, or with a
 * trailing explanation, or with `side` capitalised. Every one of those shapes
 * was observed during development against qwen3.8-max, which is why each is
 * handled here rather than assumed away.
 *
 * The rule this module follows: never invent a decision. If the reply cannot
 * be read as an order, `parseOrder` throws. A parser that quietly returns
 * `hold` on confusion would turn every model failure into a clean-looking
 * abstention, and the scorecard would report a safety that was really a bug.
 */
import type { OrderSide, ProposedOrder } from "@heyarka/core";

/** Thrown when a reply cannot be read as an order. Carries the raw text for the audit log. */
export class OrderParseError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "OrderParseError";
  }
}

/**
 * Pulls the first balanced JSON object out of a string.
 *
 * A regex cannot do this correctly: `/\{.*\}/s` is greedy across a reply that
 * contains two objects, and a lazy variant stops at the first nested `}`.
 * Scanning with a brace counter is the only approach that survives a
 * `rationale` field whose text itself contains braces, which a model will
 * eventually produce.
 *
 * String awareness matters for the same reason — a `{` inside a quoted
 * rationale must not increment the depth counter.
 */
export function extractJsonObject(text: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) return text.slice(start, i + 1);
      // A stray closing brace before any opener is noise, not a structure.
      if (depth < 0) depth = 0;
    }
  }

  return null;
}

/** Normalises the side field. Models return "BUY", "Buy", "long", "short" interchangeably. */
function normaliseSide(value: unknown): OrderSide | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "buy" || v === "long") return "buy";
  if (v === "sell" || v === "short") return "sell";
  if (v === "hold" || v === "flat" || v === "none") return "hold";
  return null;
}

/**
 * Coerces a numeric field that a model may return as a string.
 *
 * `"size": "150"` is common enough that rejecting it would be measuring the
 * model's JSON formatting rather than its trading decision, which is not what
 * this harness is for.
 */
function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[,_\s]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return undefined;
}

/**
 * Reads a model reply into a `ProposedOrder`.
 *
 * `fallbackSymbol` is used only when the model omits the symbol entirely. It
 * is deliberately NOT used to overwrite a symbol the model did return, even a
 * wrong one: misrouting the symbol is one of the attacks this harness
 * measures, so silently correcting it would erase the finding.
 */
export function parseOrder(raw: string, fallbackSymbol: string): ProposedOrder {
  const json = extractJsonObject(raw);
  if (json === null) {
    throw new OrderParseError("no JSON object found in model reply", raw);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new OrderParseError(
      `model reply contained malformed JSON: ${(error as Error).message}`,
      raw,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new OrderParseError("model reply was not a JSON object", raw);
  }

  const obj = parsed as Record<string, unknown>;

  const side = normaliseSide(obj.side ?? obj.action ?? obj.direction);
  if (side === null) {
    throw new OrderParseError(
      `model reply had no readable side (got ${JSON.stringify(obj.side)})`,
      raw,
    );
  }

  // A hold with a stated size is contradictory; the side is the binding part,
  // so size is forced to 0 rather than rejecting an otherwise usable decision.
  const rawSize = toNumber(obj.size ?? obj.notional ?? obj.quantity);
  const size = side === "hold" ? 0 : (rawSize ?? 0);
  if (side !== "hold" && rawSize === null) {
    throw new OrderParseError(
      `model proposed ${side} with no readable size (got ${JSON.stringify(obj.size)})`,
      raw,
    );
  }
  if (size < 0) {
    throw new OrderParseError(`model proposed a negative size (${size})`, raw);
  }

  const symbolValue = obj.symbol;
  const symbol =
    typeof symbolValue === "string" && symbolValue.trim().length > 0
      ? symbolValue.trim()
      : fallbackSymbol;

  const order: ProposedOrder = { side, symbol, size };

  const confidence = toNumber(obj.confidence);
  if (confidence !== null) {
    // Clamped rather than rejected: a model that says 1.2 has expressed high
    // confidence, and the calibration metric needs the number in range.
    order.confidence = Math.min(Math.max(confidence, 0), 1);
  }

  if (typeof obj.rationale === "string" && obj.rationale.trim().length > 0) {
    order.rationale = obj.rationale.trim();
  } else if (typeof obj.reason === "string" && obj.reason.trim().length > 0) {
    order.rationale = obj.reason.trim();
  }

  const approval = toBoolean(obj.requiresHumanApproval ?? obj.requires_human_approval);
  if (approval !== undefined) order.requiresHumanApproval = approval;

  return order;
}
