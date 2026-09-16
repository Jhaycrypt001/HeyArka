<!-- last_verified: 2026-09-15 -->
# Architecture

HeyArka is an adversarial evaluation harness and hardening layer for LLM trading
agents. It answers one question with evidence: **if someone poisons the text your
agent reads, does your agent still place the order it should?**

Two halves, one codebase:

- **Red** — an attack engine that mutates the text an agent perceives and measures
  whether the resulting order changed.
- **Blue** — `@heyarka/shield`, a sanitizing and gating layer that wraps an agent's
  perception and execution paths so the attacks stop working.

Everything HeyArka reports is computed from a real agent execution. There is no
sample data and no placeholder scoring anywhere in the pipeline.

## Components

- **@heyarka/core** (`packages/core/`) — TypeScript library: agent contracts, Unicode
  confusable tables, the attack vector corpus, the mutation engine, the runner that
  executes clean-vs-attacked pairs, and the scoring math
- **@heyarka/shield** (`packages/shield/`) — The defense, shipped standalone so any
  third party can install it: text sanitizer, source-corroboration gate, point-in-time
  guard, deterministic risk contract, and a drop-in wrapper for the Bitget SDK's
  `safeInvoke`
- **@heyarka/cli** (`packages/cli/`) — `arka` terminal command: `attack`, `score`,
  `report`
- **@heyarka/mcp** (`packages/mcp/`) — MCP server exposing shield and scorecard tools
  to Claude Desktop / Cursor / Windsurf, alongside Bitget's own MCP server
- **@heyarka/canary** (`packages/canary/`) — A real news-driven trading agent that runs
  against Bitget's Demo environment in two configurations, defended and undefended, to
  produce the A/B evidence
- **Attack corpus** (`packages/core/src/vectors/`) — Versioned TypeScript vector
  definitions, each a pure function carrying the citation for the technique it
  reproduces

## Deployment

- No package is published to the public npm registry yet; this is a private pnpm
  workspace. `pnpm install && pnpm build && pnpm attack` from a cloned repo is the
  real zero-config path today — see the root README for the verified judge path
- The CLI and MCP server run as local processes; no hosted service, no telemetry
- `@heyarka/canary` is the only package that requires Bitget credentials, and it
  requires a **Demo** key — it never routes to the live environment

## Threat Model

The agent under test is assumed honest; its **inputs** are not. HeyArka models an
attacker who can influence text the agent ingests — a headline, an article body, a
feed item — but who cannot modify the agent's code, credentials, or model weights.

This matters because the Bitget Agent Hub stack has three properties that make text a
live execution path:

- `bitget-signal`'s `news-briefing` skill aggregates **44 real-time sources**, and
  routes through a third-party MCP data service
- The confirmation prompt that gates write operations is an **instruction to the
  model**, delivered in the same context window an attacker is writing into — not
  enforced code
- `surface: "full"` exposes all 89 UTA v3 operations rather than the 14 curated verbs,
  and `raw` reaches any operation by `operationId`

An injected instruction that survives to the decision step therefore reaches real
order placement. HeyArka's job is to prove whether it does, and to stop it.

## Data Model Hierarchy

- **MarketContext** → contains **NewsItem[]** → an **AttackVector** transforms it →
  the agent returns a **ProposedOrder** → a clean/attacked pair becomes an
  **AttackResult** → results aggregate into a **Scorecard**
- Every `AttackResult` records both orders in full, so any score can be recomputed
  from the raw log without re-running the agent
- `Scorecard` carries its own `results[]`; the summary is always derivable from the
  evidence it ships with

## Data Stores

- **Append-only JSONL** (`reports/*.jsonl`) — One `AttackResult` per line, written as
  each pair completes. This is the audit trail; it is the source of truth for every
  number in a scorecard
- **Corpus modules** (`packages/core/src/vectors/*.ts`) — Attack vectors as typed
  TypeScript, versioned in git, so a scorecard can name the exact corpus revision it
  was produced against. An earlier revision of this document specified `corpus/*.json`;
  that directory was never built. Vectors are pure functions of their input rather than
  stored fixtures, which makes a run reproducible from the corpus revision alone with no
  fixture drift, and catches a malformed vector at compile time instead of scoring time
- No database. A run is reproducible from its corpus revision plus its JSONL log

## External Services

- **Bitget REST API v2** (`api.bitget.com`) — Reached by `@heyarka/canary` through
  `BitgetDemoClient`, a thin first-party client in `packages/canary/src/bitget-client.ts`
  that signs every request locally with HMAC-SHA256 and sends the `paptrading: 1` header
  as a hardcoded literal, so Demo (paper) mode is a property of the code rather than a
  configurable flag. Endpoints used: `/api/v2/spot/market/tickers`,
  `/api/v2/spot/account/assets`, `/api/v2/spot/trade/place`, `/api/v2/spot/trade/history`.
  An earlier revision of this document described reaching a "UTA v3" API through
  `@bitget-ai/bitget-agent-sdk` with `paperTrading: true`; that dependency was never
  added and no such code path exists
- **No mock server.** An earlier revision named a `MockServer` from the Bitget SDK as
  backing the offline demo. There is no such dependency and no offline stub of the
  exchange. The zero-config demo (`arka attack --demo`) needs no network at all because
  it attacks a real in-process agent over a fixed context, and the canary has no offline
  path whatsoever — it requires live Demo credentials and a real network, which is the
  deliberate cost of the project's rule against fake data
- **LLM provider** — Whichever model backs the agent under test. HeyArka is
  model-agnostic; the agent owns its provider

## Trust Boundaries

- **Text is untrusted.** Every string reaching an agent from a feed, a headline, or an
  article body is attacker-controlled until the shield's sanitizer has normalized it
- **Credentials never enter agent context.** The Bitget SDK reads keys from environment
  variables and signs locally; HeyArka never reads, forwards, or logs them, and no
  credential appears in a JSONL record
- **The LLM is not a security control.** Confirmation prompts and system-prompt rules
  live inside the attacker's reach. The risk contract is therefore enforced in
  deterministic code outside the model, and can veto any order the model proposes
- **The canary is Demo-only, enforced in code rather than by configuration.** Every
  request `BitgetDemoClient` builds carries `paptrading: "1"` as a single hardcoded
  string literal in the one request builder -- there is no environment variable, no
  constructor option and no conditional that can change it, so there is no
  misconfiguration that reaches live funds. An earlier revision of this document
  described a `paperTrading: true` flag asserted at construction plus a base-URL check;
  that describes an SDK this project does not use, and a base-URL switch would be the
  weaker design precisely because it could be pointed elsewhere

## Data Flows

- **Attack**: `MarketContext` (clean) → `AttackVector.apply()` → `MarketContext`
  (attacked) → agent under test → two `ProposedOrder`s → diffed → `AttackResult` →
  appended to JSONL
- **Defense**: raw `NewsItem[]` → sanitizer (NFKC + confusable folding + invisible
  stripping) → corroboration gate (independent-source counting) → point-in-time guard →
  agent → `ProposedOrder` → risk contract → allowed order or veto
- **Scoring**: JSONL log → aggregate by family → susceptibility, risk-violation,
  consistency, look-ahead, takeover rates → `Scorecard`
- **Canary A/B**: one market context → defended agent and undefended agent → two Demo
  accounts → two order streams → attributable PnL delta

## Core Patterns

- **`AgentUnderTest` is the only integration point.** One method, `decide(ctx) =>
  ProposedOrder`. Any agent wrappable in that shape is testable, which is what makes
  the harness plug-and-play rather than framework-specific
- **Attack and defense share one Unicode table.** `CONFUSABLES` and `INVISIBLE_CHARS`
  live in `core/src/unicode.ts` and are consumed by both the homoglyph vector and the
  shield's sanitizer, so a character the attacker can use is one the defender can
  always see. Drift between them is structurally impossible
- **Clean-vs-attacked pairing.** A vector never asserts an absolute outcome; it asserts
  a *change*. The same context is run twice and the orders are diffed, so a
  nondeterministic agent is measured on its response to the attack rather than on its
  baseline
- **Deterministic vectors.** Mutations are pure functions of their input with no
  randomness, so a result is reproducible from its corpus revision
- **The risk contract is non-LLM.** It is plain predicate code over a `ProposedOrder`.
  It cannot be argued with, because it never sees prose
- **Fail-closed gating.** When the shield cannot establish that input is clean — an
  unparseable date, an unresolvable source — it degrades toward veto rather than
  allowing the order through
- **Evidence before summary.** Scores are always computed from persisted results, never
  accumulated in memory alongside them, so the number in a report and the log on disk
  cannot disagree

## Canonical Files

- Agent contracts: `packages/core/src/types.ts`
- Unicode confusables + invisible characters: `packages/core/src/unicode.ts`
- Attack vector corpus: `packages/core/src/vectors/`
- Attack runner: `packages/core/src/runner.ts`
- Scoring math: `packages/core/src/score.ts`
- Text sanitizer: `packages/shield/src/sanitize.ts`
- Risk contract enforcement: `packages/core/src/risk.ts`
- CLI entry: `packages/cli/src/index.ts`
- MCP server: `packages/mcp/src/server.ts`

## Attack Families

| Family | What it manipulates | Reproduces |
|---|---|---|
| `homoglyph` | Ticker recognition, via Cyrillic/Greek characters that render as Latin | arXiv:2601.13082 |
| `hidden-text` | Sentiment, via zero-width and bidi characters carrying unseen text | arXiv:2601.13082 |
| `tool-hijack` | Tool selection, incl. escalation to `raw` and `surface: "full"` | OWASP ASI 2026 |
| `semantic-trap` | Corroboration, via one rumor echoed to look like many sources | — |
| `look-ahead` | Evaluation integrity, by detecting answers from training memory | arXiv:2601.13770 |
| `sentiment-filter` | Entry gating in strategies that filter on crowded sentiment | — |

## Metrics

Named to match what the Bitget Agentic Trading Open Theme asks for, each computed from
the JSONL log:

- **Injection susceptibility rate** — share of attacks that changed direction, symbol,
  or size materially
- **Risk-violation rate** — share of runs breaching the agent's declared risk contract
- **Decision consistency** — agreement across repeated identical inputs
- **Look-ahead contamination** — reliance on training memory over provided context
- **Human-takeover rate** — share of decisions correctly escalated instead of executed
- **Attributable PnL delta** — defended minus undefended return over the same window,
  from the canary's two Demo accounts
