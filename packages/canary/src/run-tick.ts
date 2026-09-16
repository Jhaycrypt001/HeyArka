/**
 * One real tick of the canary's A/B loop: fetch a live price and live news
 * from Bitget/Cointelegraph, build one shared `MarketContext`, run it past
 * the control agent and the shielded agent, and (if either decides to trade)
 * place a real order on that agent's own Demo account. Both agents see
 * identical real input; the only variable between them is the shield.
 */
import type { AgentUnderTest, MarketContext, RiskContract } from "@heyarka/core";
import { checkRiskContract } from "@heyarka/core";
import { shieldAgent } from "@heyarka/shield";
import type { ShieldAuditEvent } from "@heyarka/shield";
import { BitgetDemoClient, BitgetApiError } from "./bitget-client.js";
import type { CanaryCredentials } from "./credentials.js";
import { fetchLatestNews } from "./news-source.js";
import type { CanaryTick, TickOutcome } from "./types.js";

export interface RunTickOptions {
  symbol: string;
  credentials: CanaryCredentials;
  controlAgent: AgentUnderTest;
  /**
   * Same decision logic as `controlAgent` — the shield wraps it, it does not
   * replace it. Pass the identical agent instance (or an equivalent one) so
   * the only difference between control and shielded is the shield itself.
   */
  shieldedAgentBase: AgentUnderTest;
  riskContract: RiskContract;
  /** Notional (quote currency) to place per non-hold decision. Kept small and fixed for a paper A/B. */
  orderNotional: number;
  newsWindowMs?: number;
  /** Set false to score decisions without ever calling `placeOrder` (dry run). */
  placeOrders?: boolean;
  onShieldAudit?: (event: ShieldAuditEvent) => void;
}

const DEFAULT_NEWS_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Both agents place orders against the same shared Bitget Demo wallet (see
 * bitget-demo-wallet-isolation finding) — a prefixed clientOid is the only
 * way to attribute a fill back to control vs. shielded from shared order
 * history, so every real order this function places must carry one.
 */
function makeClientOid(agentTag: "control" | "shielded"): string {
  return `harka-${agentTag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function executeOutcome(
  client: BitgetDemoClient,
  symbol: string,
  order: Awaited<ReturnType<AgentUnderTest["decide"]>>,
  orderNotional: number,
  placeOrders: boolean,
  agentTag: "control" | "shielded",
): Promise<TickOutcome> {
  if (order.side === "hold") {
    return { order, skippedReason: "agent held" };
  }
  if (!placeOrders) {
    return { order, skippedReason: "dry run: placeOrders disabled" };
  }

  try {
    const result = await client.placeOrder({
      symbol,
      side: order.side,
      size: orderNotional.toString(),
      orderType: "market",
      clientOid: makeClientOid(agentTag),
    });
    const balances = await client.getBalances();
    const usdtBalance = balances.find((b) => b.coin.toUpperCase() === "USDT");
    return {
      order,
      placedOrderId: result.orderId,
      balanceAfter: usdtBalance?.available,
    };
  } catch (err) {
    const message = err instanceof BitgetApiError ? `${err.message} (code ${err.code ?? "?"})` : String(err);
    return { order, errorMessage: message };
  }
}

/** Runs exactly one real tick and returns the completed record, ready to append to the log. */
export async function runTick(options: RunTickOptions): Promise<CanaryTick> {
  const {
    symbol,
    credentials,
    controlAgent,
    shieldedAgentBase,
    riskContract,
    orderNotional,
    newsWindowMs = DEFAULT_NEWS_WINDOW_MS,
    placeOrders = true,
    onShieldAudit,
  } = options;

  const controlClient = new BitgetDemoClient(credentials.control);
  const shieldedClient = new BitgetDemoClient(credentials.shielded);

  const asOf = new Date();
  const [ticker, news] = await Promise.all([
    controlClient.getTicker(symbol),
    fetchLatestNews({ asOf, windowMs: newsWindowMs }),
  ]);

  const context: MarketContext = {
    asOf: asOf.toISOString(),
    symbol,
    price: ticker.lastPrice,
    news,
  };

  const shielded = shieldAgent(shieldedAgentBase, { riskContract, onAudit: onShieldAudit });

  const [controlOrder, shieldedOrder] = await Promise.all([
    controlAgent.decide(context),
    shielded.decide(context),
  ]);

  // The control account has no shield's risk-contract backstop; the canary
  // still records what the deterministic contract would have said, purely
  // for the scorecard's riskViolationRate — it does not alter the order.
  const controlViolations = checkRiskContract(controlOrder, riskContract);

  const [controlOutcome, shieldedOutcome] = await Promise.all([
    executeOutcome(controlClient, symbol, controlOrder, orderNotional, placeOrders, "control"),
    executeOutcome(shieldedClient, symbol, shieldedOrder, orderNotional, placeOrders, "shielded"),
  ]);

  if (controlViolations.length > 0) {
    controlOutcome.skippedReason = [controlOutcome.skippedReason, `risk contract would flag: ${controlViolations.join("; ")}`]
      .filter(Boolean)
      .join("; ");
  }

  return {
    timestamp: asOf.toISOString(),
    symbol,
    price: ticker.lastPrice,
    newsIds: news.map((n) => n.id),
    control: controlOutcome,
    shielded: shieldedOutcome,
  };
}
