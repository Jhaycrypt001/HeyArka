/**
 * Minimal Bitget v2 REST client, scoped to exactly what the canary needs:
 * market ticker, account balance, and spot order placement. Implements
 * Bitget's documented v2 signing scheme directly (HMAC-SHA256 of
 * timestamp+method+requestPath[+queryString]+body, base64-encoded) rather
 * than depending on a third-party SDK, so the signing logic here is fully
 * auditable.
 *
 * Demo trading is not a different base URL — it is the header
 * `paptrading: 1` sent alongside a Demo API key. This client hardcodes that
 * header unconditionally; there is deliberately no `live` mode. A canary
 * that could accidentally target live funds is not something this project
 * ships, per the standing rule that this tool never touches live trading.
 */
import { createHmac } from "node:crypto";
import type { BitgetCredentials } from "./credentials.js";

const BASE_URL = "https://api.bitget.com";

export interface BitgetTicker {
  symbol: string;
  lastPrice: number;
  timestampMs: number;
}

export interface BitgetBalanceEntry {
  coin: string;
  available: number;
  frozen: number;
}

export interface BitgetOrderRequest {
  symbol: string;
  side: "buy" | "sell";
  /** Notional size in the order's base unit, as a plain decimal string Bitget expects. */
  size: string;
  orderType: "market" | "limit";
  price?: string;
  /**
   * Caller-supplied client order id. Both control and shielded canary
   * agents place orders through the same shared Demo wallet (see
   * bitget-demo-wallet-isolation memory) — this is the only per-order tag
   * Bitget returns back in order history, so attribution depends on the
   * caller always setting this rather than letting Bitget auto-generate one.
   */
  clientOid?: string;
}

export interface BitgetOrderResult {
  orderId: string;
  clientOrderId?: string;
  raw: unknown;
}

export interface BitgetHistoryOrder {
  orderId: string;
  clientOid?: string;
  symbol: string;
  side: "buy" | "sell";
  priceAvg: number;
  baseVolume: number;
  quoteVolume: number;
  status: string;
  cTime: number;
}

class BitgetApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "BitgetApiError";
  }
}

function sign(secret: string, timestamp: string, method: string, requestPath: string, body: string): string {
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
  return createHmac("sha256", secret).update(prehash).digest("base64");
}

/**
 * A thin, real REST client for Bitget's v2 API in Demo (paper) trading mode
 * only. Every method performs a genuine signed HTTPS request — there is no
 * offline/mock code path here, matching the project rule against fake data;
 * the price of that is that every method requires network access and valid
 * Demo credentials to run, which is why the unit tests for this file exercise
 * the signing math in isolation rather than hitting the network.
 */
export class BitgetDemoClient {
  constructor(private readonly credentials: BitgetCredentials) {}

  private async request<T>(method: "GET" | "POST", path: string, params?: Record<string, string>, body?: unknown): Promise<T> {
    const timestamp = Date.now().toString();
    const query = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : "";
    const bodyStr = body !== undefined ? JSON.stringify(body) : "";
    const requestPath = `${path}${query}`;
    const signature = sign(this.credentials.apiSecret, timestamp, method, requestPath, bodyStr);

    const response = await fetch(`${BASE_URL}${requestPath}`, {
      method,
      headers: {
        "ACCESS-KEY": this.credentials.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": this.credentials.passphrase,
        "Content-Type": "application/json",
        "locale": "en-US",
        // Demo/paper trading marker. Unconditional — see file-level comment.
        "paptrading": "1",
      },
      body: method === "POST" ? bodyStr : undefined,
    });

    const json = (await response.json()) as { code: string; msg: string; data: T };
    if (json.code !== "00000") {
      throw new BitgetApiError(json.msg, json.code, response.status);
    }
    return json.data;
  }

  /** Real-time last price for a spot symbol, e.g. "TSLAUSDT" if listed, or a crypto pair like "BTCUSDT". */
  async getTicker(symbol: string): Promise<BitgetTicker> {
    const data = await this.request<Array<{ lastPr: string; ts: string }>>("GET", "/api/v2/spot/market/tickers", { symbol });
    const entry = data[0];
    if (!entry) throw new BitgetApiError(`No ticker data returned for symbol ${symbol}`);
    return { symbol, lastPrice: Number(entry.lastPr), timestampMs: Number(entry.ts) };
  }

  /** Demo-account spot balances. */
  async getBalances(): Promise<BitgetBalanceEntry[]> {
    const data = await this.request<Array<{ coin: string; available: string; frozen: string }>>(
      "GET",
      "/api/v2/spot/account/assets",
    );
    return data.map((d) => ({ coin: d.coin, available: Number(d.available), frozen: Number(d.frozen) }));
  }

  /** Places a real (demo-account) spot order. `force` defaults to good-till-cancelled for limit orders. */
  async placeOrder(order: BitgetOrderRequest): Promise<BitgetOrderResult> {
    const body: Record<string, string> = {
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      size: order.size,
      force: "gtc",
    };
    if (order.orderType === "limit") {
      if (!order.price) throw new BitgetApiError("price is required for limit orders");
      body.price = order.price;
    }
    if (order.clientOid) {
      body.clientOid = order.clientOid;
    }
    const data = await this.request<{ orderId: string; clientOid?: string }>("POST", "/api/v2/spot/trade/place-order", undefined, body);
    return { orderId: data.orderId, clientOrderId: data.clientOid, raw: data };
  }

  /**
   * Real order history for a symbol, newest first, `clientOid` intact.
   * This — not the fills endpoint, which does not return `clientOid` — is
   * how the canary attributes shared-wallet activity back to the control
   * vs. shielded agent, per the confirmed Bitget v2 field split.
   */
  async getOrderHistory(symbol: string, options?: { startTime?: number; endTime?: number; limit?: number }): Promise<BitgetHistoryOrder[]> {
    const params: Record<string, string> = { symbol };
    if (options?.startTime) params.startTime = String(options.startTime);
    if (options?.endTime) params.endTime = String(options.endTime);
    params.limit = String(options?.limit ?? 100);

    const data = await this.request<
      Array<{
        orderId: string;
        clientOid?: string;
        symbol: string;
        side: "buy" | "sell";
        priceAvg: string;
        baseVolume: string;
        quoteVolume: string;
        status: string;
        cTime: string;
      }>
    >("GET", "/api/v2/spot/trade/history-orders", params);

    return data.map((d) => ({
      orderId: d.orderId,
      clientOid: d.clientOid,
      symbol: d.symbol,
      side: d.side,
      priceAvg: Number(d.priceAvg),
      baseVolume: Number(d.baseVolume),
      quoteVolume: Number(d.quoteVolume),
      status: d.status,
      cTime: Number(d.cTime),
    }));
  }
}

export { sign as signBitgetRequest, BitgetApiError };
