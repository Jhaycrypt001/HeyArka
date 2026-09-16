import { describe, expect, it } from "vitest";
import { reconstructAttribution } from "./attribution.js";
import type { BitgetHistoryOrder } from "./bitget-client.js";

// Field shapes here mirror exactly what getOrderHistory returned from a real
// live Bitget Demo call during development (see conversation record):
// { orderId, clientOid, symbol, side, priceAvg, baseVolume, quoteVolume,
//   status: "filled", cTime }. These fixtures are hand-constructed to test
// the FIFO matching arithmetic, not fetched live, but the shape is the real
// one — not a guess.
function order(partial: Partial<BitgetHistoryOrder> & Pick<BitgetHistoryOrder, "orderId" | "clientOid" | "side" | "priceAvg" | "baseVolume" | "cTime">): BitgetHistoryOrder {
  return {
    symbol: "BTCUSDT",
    quoteVolume: partial.priceAvg * partial.baseVolume,
    status: "filled",
    ...partial,
  };
}

describe("reconstructAttribution", () => {
  it("attributes orders to the correct agent purely by clientOid prefix, ignoring the other tag", () => {
    const orders: BitgetHistoryOrder[] = [
      order({ orderId: "1", clientOid: "harka-control-1000-a", side: "buy", priceAvg: 100, baseVolume: 1, cTime: 1000 }),
      order({ orderId: "2", clientOid: "harka-shielded-1500-b", side: "buy", priceAvg: 200, baseVolume: 1, cTime: 1500 }),
      order({ orderId: "3", clientOid: "harka-control-2000-c", side: "sell", priceAvg: 110, baseVolume: 1, cTime: 2000 }),
    ];

    const { control, shielded } = reconstructAttribution(orders);

    expect(control.ordersMatched).toBe(2);
    expect(control.realizedTrades).toHaveLength(1);
    expect(control.totalRealizedPnl).toBeCloseTo(10, 8); // (110 - 100) * 1

    expect(shielded.ordersMatched).toBe(1);
    expect(shielded.realizedTrades).toHaveLength(0);
    expect(shielded.openLots).toHaveLength(1);
    expect(shielded.openLots[0]?.price).toBe(200);
  });

  it("FIFO-matches a partial close across multiple buys correctly", () => {
    const orders: BitgetHistoryOrder[] = [
      order({ orderId: "1", clientOid: "harka-control-1-a", side: "buy", priceAvg: 100, baseVolume: 1, cTime: 1 }),
      order({ orderId: "2", clientOid: "harka-control-2-b", side: "buy", priceAvg: 120, baseVolume: 1, cTime: 2 }),
      // Sells 1.5 — should close all of lot 1 (price 100) and half of lot 2 (price 120), oldest first.
      order({ orderId: "3", clientOid: "harka-control-3-c", side: "sell", priceAvg: 130, baseVolume: 1.5, cTime: 3 }),
    ];

    const { control } = reconstructAttribution(orders);

    expect(control.realizedTrades).toHaveLength(2);
    expect(control.realizedTrades[0]).toMatchObject({ volume: 1, buyPrice: 100, sellPrice: 130 });
    expect(control.realizedTrades[1]).toMatchObject({ volume: 0.5, buyPrice: 120, sellPrice: 130 });
    // (130-100)*1 + (130-120)*0.5 = 30 + 5 = 35
    expect(control.totalRealizedPnl).toBeCloseTo(35, 8);
    expect(control.openLots).toHaveLength(1);
    expect(control.openLots[0]?.volume).toBeCloseTo(0.5, 8);
  });

  it("reports a loss as negative realized PnL", () => {
    const orders: BitgetHistoryOrder[] = [
      order({ orderId: "1", clientOid: "harka-shielded-1-a", side: "buy", priceAvg: 100, baseVolume: 2, cTime: 1 }),
      order({ orderId: "2", clientOid: "harka-shielded-2-b", side: "sell", priceAvg: 90, baseVolume: 2, cTime: 2 }),
    ];

    const { shielded } = reconstructAttribution(orders);
    expect(shielded.totalRealizedPnl).toBeCloseTo(-20, 8); // (90-100)*2
  });

  it("excludes unfilled and untagged orders from attribution entirely", () => {
    const orders: BitgetHistoryOrder[] = [
      order({ orderId: "1", clientOid: "harka-control-1-a", side: "buy", priceAvg: 100, baseVolume: 1, cTime: 1, status: "cancelled" }),
      order({ orderId: "2", clientOid: "some-other-tool-oid", side: "buy", priceAvg: 100, baseVolume: 1, cTime: 2 }),
      order({ orderId: "3", clientOid: undefined, side: "buy", priceAvg: 100, baseVolume: 1, cTime: 3 }),
    ];

    const { control, shielded } = reconstructAttribution(orders);
    expect(control.ordersMatched).toBe(0);
    expect(shielded.ordersMatched).toBe(0);
  });

  it("returns zero PnL and no open lots for an empty history", () => {
    const { control, shielded } = reconstructAttribution([]);
    expect(control.totalRealizedPnl).toBe(0);
    expect(control.realizedTrades).toEqual([]);
    expect(control.openLots).toEqual([]);
    expect(shielded.totalRealizedPnl).toBe(0);
  });

  it("handles a short-opening sell (sell before any buy) as an open short lot, not a crash", () => {
    const orders: BitgetHistoryOrder[] = [
      order({ orderId: "1", clientOid: "harka-control-1-a", side: "sell", priceAvg: 100, baseVolume: 1, cTime: 1 }),
    ];

    const { control } = reconstructAttribution(orders);
    expect(control.realizedTrades).toEqual([]);
    expect(control.openLots).toHaveLength(1);
    expect(control.openLots[0]).toMatchObject({ side: "sell", volume: 1, price: 100 });
  });
});
