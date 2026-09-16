/**
 * Reconstructs each canary agent's own realized PnL from one shared Bitget
 * Demo wallet's order history, keyed only by the `harka-<tag>-...` clientOid
 * prefix each order was placed with (see run-tick.ts's makeClientOid).
 *
 * Basis: FIFO-matched realized PnL per tag. An agent's buys open lots; its
 * later sells close the oldest open lots first and realize (sellPrice -
 * buyPrice) * matchedVolume. This deliberately does not touch the wallet's
 * balance or assume any starting capital split between control and
 * shielded — both attribution and confounds-from-the-other-agent's-fills are
 * avoided entirely, because it is derived purely from each tag's own orders.
 * Unmatched open lots at the end are reported separately as unrealized
 * (not marked to market here — that would require a price the caller supplies).
 */
import type { BitgetHistoryOrder } from "./bitget-client.js";

export type CanaryAgentTag = "control" | "shielded";

export interface RealizedTrade {
  closedAt: number;
  volume: number;
  buyPrice: number;
  sellPrice: number;
  /** (sellPrice - buyPrice) * volume. Negative on a loss. */
  realizedPnl: number;
  buyOrderId: string;
  sellOrderId: string;
}

export interface OpenLot {
  orderId: string;
  openedAt: number;
  side: "buy" | "sell";
  volume: number;
  price: number;
}

export interface AgentAttribution {
  tag: CanaryAgentTag;
  ordersMatched: number;
  ordersSkipped: number;
  realizedTrades: RealizedTrade[];
  totalRealizedPnl: number;
  openLots: OpenLot[];
}

function tagFromClientOid(clientOid: string | undefined): CanaryAgentTag | undefined {
  if (!clientOid) return undefined;
  if (clientOid.startsWith("harka-control-")) return "control";
  if (clientOid.startsWith("harka-shielded-")) return "shielded";
  return undefined;
}

/**
 * FIFO-matches one tag's own filled orders (oldest first) into realized
 * trades. A buy opens (or adds to) inventory; a sell consumes the oldest
 * open buy volume first, and vice versa for a short-opening sell — so this
 * also works if an agent ever sells before it has bought anything for this
 * symbol in the observed window.
 */
function reconstructOneTag(tag: CanaryAgentTag, orders: BitgetHistoryOrder[]): AgentAttribution {
  const filled = orders
    .filter((o) => tagFromClientOid(o.clientOid) === tag && o.status === "filled" && o.baseVolume > 0)
    .sort((a, b) => a.cTime - b.cTime);

  const openLots: OpenLot[] = [];
  const realizedTrades: RealizedTrade[] = [];
  let ordersSkipped = 0;

  for (const order of filled) {
    let remaining = order.baseVolume;
    const opposite = order.side === "buy" ? "sell" : "buy";

    while (remaining > 1e-12 && openLots.length > 0 && openLots[0]?.side === opposite) {
      const lot = openLots[0];
      if (!lot) break;
      const matched = Math.min(remaining, lot.volume);

      const buyPrice = order.side === "buy" ? order.priceAvg : lot.price;
      const sellPrice = order.side === "buy" ? lot.price : order.priceAvg;
      const buyOrderId = order.side === "buy" ? order.orderId : lot.orderId;
      const sellOrderId = order.side === "buy" ? lot.orderId : order.orderId;

      realizedTrades.push({
        closedAt: order.cTime,
        volume: matched,
        buyPrice,
        sellPrice,
        realizedPnl: (sellPrice - buyPrice) * matched,
        buyOrderId,
        sellOrderId,
      });

      lot.volume -= matched;
      remaining -= matched;
      if (lot.volume <= 1e-12) openLots.shift();
    }

    if (remaining > 1e-12) {
      openLots.push({ orderId: order.orderId, openedAt: order.cTime, side: order.side, volume: remaining, price: order.priceAvg });
    }
  }

  const untaggedOrThrown = orders.length - filled.length;
  ordersSkipped = untaggedOrThrown;

  return {
    tag,
    ordersMatched: filled.length,
    ordersSkipped,
    realizedTrades,
    totalRealizedPnl: realizedTrades.reduce((sum, t) => sum + t.realizedPnl, 0),
    openLots,
  };
}

/**
 * Splits one shared wallet's order history into independent control vs.
 * shielded realized-PnL reconstructions. `orders` should be the full history
 * for the symbol under test (both agents' orders interleaved) — this is
 * exactly what `BitgetDemoClient.getOrderHistory` returns.
 */
export function reconstructAttribution(orders: BitgetHistoryOrder[]): { control: AgentAttribution; shielded: AgentAttribution } {
  return {
    control: reconstructOneTag("control", orders),
    shielded: reconstructOneTag("shielded", orders),
  };
}
