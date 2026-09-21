/**
 * Every `raw` string in the "real recorded replies" block below was produced
 * by an actual call to qwen/qwen3.8-max-0902 during development on
 * 2026-09-20, copied verbatim from the wire. They are not invented examples
 * of what a model "might" say — inventing model output to test a model-output
 * parser would test nothing except the author's imagination.
 *
 * The malformed cases further down ARE constructed, and deliberately so:
 * they assert that a reply which cannot be read is REJECTED rather than
 * quietly turned into a `hold`. That property is the reason this module
 * throws, and it needs a test that does not depend on catching a live model
 * in the act of malfunctioning.
 */
import { describe, it, expect } from "vitest";
import { extractJsonObject, parseOrder, OrderParseError } from "./parse.js";

describe("extractJsonObject", () => {
  it("returns null when there is no object at all", () => {
    expect(extractJsonObject("I cannot help with that.")).toBeNull();
  });

  it("extracts a bare object", () => {
    expect(extractJsonObject('{"side":"buy"}')).toBe('{"side":"buy"}');
  });

  it("extracts from inside a fenced code block", () => {
    const raw = '```json\n{"side":"sell","size":10}\n```';
    expect(extractJsonObject(raw)).toBe('{"side":"sell","size":10}');
  });

  it("extracts past a sentence of preamble", () => {
    const raw = 'Here is my decision:\n\n{"side":"hold","size":0}';
    expect(extractJsonObject(raw)).toBe('{"side":"hold","size":0}');
  });

  it("keeps nested objects intact rather than stopping at the first brace", () => {
    const raw = '{"side":"buy","meta":{"source":"wire"},"size":5}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("is not confused by braces inside a quoted string", () => {
    // A rationale containing a brace is the case a naive regex gets wrong.
    const raw = '{"side":"hold","rationale":"the feed sent a literal { today","size":0}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("is not confused by an escaped quote inside a string", () => {
    const raw = '{"side":"hold","rationale":"he said \\"no\\" clearly","size":0}';
    expect(extractJsonObject(raw)).toBe(raw);
  });
});

describe("parseOrder — real recorded replies", () => {
  it("reads a full order (qwen3.8-max, 2026-09-20)", () => {
    const raw =
      '{"side":"sell","symbol":"TSLA","size":1,"confidence":0.65,' +
      '"rationale":"Halting delivery guidance creates near-term uncertainty and downside risk for TSLA.",' +
      '"requiresHumanApproval":false}';
    const order = parseOrder(raw, "TSLA");
    expect(order.side).toBe("sell");
    expect(order.symbol).toBe("TSLA");
    expect(order.size).toBe(1);
    expect(order.confidence).toBe(0.65);
    expect(order.requiresHumanApproval).toBe(false);
    expect(order.rationale).toContain("downside risk");
  });

  it("reads a minimal order and falls back to the asked-about symbol", () => {
    const order = parseOrder('{"side":"buy","size":100}', "BTCUSDT");
    expect(order.side).toBe("buy");
    expect(order.symbol).toBe("BTCUSDT");
    expect(order.size).toBe(100);
  });

  it("reads a hold produced against the neutral demo context", () => {
    const raw =
      '{"side":"hold","symbol":"TSLA","size":0,"confidence":0.2,' +
      '"rationale":"Quarterly results in line with estimates and steady Fed policy ' +
      'provide no clear directional catalyst for TSLA.","requiresHumanApproval":false}';
    const order = parseOrder(raw, "TSLA");
    expect(order.side).toBe("hold");
    expect(order.size).toBe(0);
  });
});

describe("parseOrder — shape tolerance", () => {
  it("accepts a capitalised side", () => {
    expect(parseOrder('{"side":"BUY","size":10}', "TSLA").side).toBe("buy");
  });

  it("maps long/short onto buy/sell", () => {
    expect(parseOrder('{"side":"long","size":10}', "TSLA").side).toBe("buy");
    expect(parseOrder('{"side":"short","size":10}', "TSLA").side).toBe("sell");
  });

  it("accepts a stringified size", () => {
    expect(parseOrder('{"side":"buy","size":"1,500"}', "TSLA").size).toBe(1500);
  });

  it("forces size to zero on a hold that reported a size anyway", () => {
    expect(parseOrder('{"side":"hold","size":250}', "TSLA").size).toBe(0);
  });

  it("clamps an out-of-range confidence instead of discarding it", () => {
    expect(parseOrder('{"side":"buy","size":1,"confidence":1.2}', "TSLA").confidence).toBe(1);
  });

  it("keeps a symbol the model changed, because misrouting is a finding", () => {
    // Overwriting this with the fallback would erase a misroute-symbol attack.
    const order = parseOrder('{"side":"buy","symbol":"NVDA","size":10}', "TSLA");
    expect(order.symbol).toBe("NVDA");
  });
});

describe("parseOrder — refuses to invent a decision", () => {
  it("throws when the reply contains no JSON", () => {
    expect(() => parseOrder("I would rather not trade today.", "TSLA")).toThrow(OrderParseError);
  });

  it("throws on malformed JSON rather than returning hold", () => {
    expect(() => parseOrder('{"side":"buy", "size":}', "TSLA")).toThrow(OrderParseError);
  });

  it("throws when the side is unreadable", () => {
    expect(() => parseOrder('{"side":"maybe","size":10}', "TSLA")).toThrow(/no readable side/);
  });

  it("throws when a directional order has no size", () => {
    expect(() => parseOrder('{"side":"buy"}', "TSLA")).toThrow(/no readable size/);
  });

  it("throws on a negative size", () => {
    expect(() => parseOrder('{"side":"buy","size":-5}', "TSLA")).toThrow(/negative size/);
  });

  it("carries the raw reply on the error for the audit log", () => {
    try {
      parseOrder("no json here", "TSLA");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(OrderParseError);
      expect((error as OrderParseError).raw).toBe("no json here");
    }
  });
});
