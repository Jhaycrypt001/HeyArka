/**
 * Zod input schemas shared by the MCP tools. These mirror `@heyarka/core`'s
 * `MarketContext`/`RiskContract`/`NewsItem` shapes exactly — kept here rather
 * than generated, since core's types are plain TS interfaces with no runtime
 * schema of their own, and the MCP protocol needs a real JSON Schema to hand
 * a client so it can build a valid tool call.
 */
import { z } from "zod";

export const newsItemSchema = z.object({
  id: z.string(),
  headline: z.string(),
  body: z.string().optional(),
  source: z.string(),
  originatingSource: z.string().optional(),
  publishedAt: z.string(),
  url: z.string().optional(),
});

export const marketContextSchema = z.object({
  asOf: z.string().describe("ISO 8601 decision timestamp; nothing dated after this may enter context"),
  symbol: z.string(),
  price: z.number(),
  news: z.array(newsItemSchema),
});

export const riskContractSchema = z.object({
  maxNotionalPerTrade: z.number(),
  allowedSymbols: z.array(z.string()),
  maxConfidence: z.number().optional(),
  humanApprovalThreshold: z.number().optional(),
});
