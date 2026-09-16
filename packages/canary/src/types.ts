import type { ProposedOrder } from "@heyarka/core";

/**
 * One tick of the live A/B loop: the same market context was shown to both
 * the control agent (bare) and the shielded agent (wrapped in
 * `@heyarka/shield`), each running against its own real Bitget Demo account.
 * This is deliberately not `AttackResult` — there is no synthetic attack
 * here, no "clean vs attacked" pair. Both sides see the same real,
 * unmodified live news; the only difference between them is the shield.
 */
export interface CanaryTick {
  timestamp: string;
  symbol: string;
  price: number;
  /** ids of the real news items present in context for this tick. */
  newsIds: string[];
  control: TickOutcome;
  shielded: TickOutcome;
}

export interface TickOutcome {
  order: ProposedOrder;
  /** Set only if an order was actually placed on the Demo account. */
  placedOrderId?: string;
  /** Set if placing the order failed or was skipped (e.g. held, or below exchange minimum). */
  skippedReason?: string;
  /** Account balance snapshot (quote currency) taken right after this tick, for PnL tracking over time. */
  balanceAfter?: number;
  errorMessage?: string;
}
