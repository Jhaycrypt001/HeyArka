import { describe, expect, it } from "vitest";
import { signBitgetRequest } from "./bitget-client.js";

// Expected values computed independently via node -e 'crypto.createHmac(...)',
// not by calling signBitgetRequest itself, so this actually checks the
// implementation against Bitget's documented prehash string rather than
// just re-running the same code.
describe("signBitgetRequest", () => {
  it("matches an independently computed HMAC-SHA256 for a signed GET request", () => {
    const signature = signBitgetRequest(
      "test-secret",
      "1700000000000",
      "GET",
      "/api/v2/spot/market/tickers?symbol=BTCUSDT",
      "",
    );
    expect(signature).toBe("wJIbveegNzdZ6avEP4sw4uIecFce6See7NgWfNwOLF0=");
  });

  it("matches an independently computed HMAC-SHA256 for a signed POST request with a JSON body", () => {
    const body = JSON.stringify({ symbol: "BTCUSDT", side: "buy", orderType: "market", size: "15", force: "gtc" });
    const signature = signBitgetRequest("test-secret", "1700000000000", "POST", "/api/v2/spot/trade/place-order", body);
    expect(signature).toBe("LaQmbVoILw10t4tClz06VwNHkqBEDevbn2QZvfk/sU4=");
  });

  it("lowercases method input consistently with an uppercase method (Bitget's scheme uppercases the verb)", () => {
    const upper = signBitgetRequest("secret", "123", "GET", "/path", "");
    const lower = signBitgetRequest("secret", "123", "get", "/path", "");
    expect(lower).toBe(upper);
  });

  it("produces a different signature for a different secret, timestamp, path, or body", () => {
    const base = signBitgetRequest("secret", "123", "GET", "/path", "");
    expect(signBitgetRequest("other-secret", "123", "GET", "/path", "")).not.toBe(base);
    expect(signBitgetRequest("secret", "456", "GET", "/path", "")).not.toBe(base);
    expect(signBitgetRequest("secret", "123", "GET", "/other-path", "")).not.toBe(base);
    expect(signBitgetRequest("secret", "123", "GET", "/path", "{}")).not.toBe(base);
  });
});
