# HeyArka Landing Page — Build Spec

Reverse-engineered from 35 frames extracted from the reference video
(`video_2026-09-15_14-20-33.mp4`, scroll-through of scale.com), mapped onto
HeyArka's real, verified content. Every section below records the observed
structure, spacing and motion, then the HeyArka content that replaces it.

**Rule for this page: no invented numbers.** Every figure rendered on the
landing page must already be true in this repo and provable by running the
CLI. The verified set is listed in "Content Source of Truth" at the bottom.

---

## 0. Global

| Property | Value | Source |
|---|---|---|
| Page max width | `1280px` | `--page-max-width` |
| Viewport gutter | `20px` each side (hero video inset), `~123px` content inset at 1280px viewport | measured from frames |
| Section gap | `64px` base, `96–160px` between major bands | `--section-gap` + frames |
| Card radius | `16px` | `--radius-cards` |
| Card padding | `32px` | `--card-padding` |
| Shadows | **none** on cards/panels | DESIGN.md "Don't" |
| Heading weight | **400 everywhere** — never 600+ | DESIGN.md typography philosophy |
| Tracking | `-0.01em` across 16–64px | DESIGN.md |
| Font feature | `font-feature-settings: "ss02" on` | DESIGN.md |

**Fonts.** Aeonik is commercial. Substitute per DESIGN.md line 29:
**Inter** (or Satoshi) for `--font-aeonik`, **JetBrains Mono** for `--font-mono`.
Both self-hosted via `next/font` — no external CDN, no layout shift.

### Tailwind v4 trap — do not copy `theme.css` verbatim

`heyarka theme.css` puts `--spacing-4 … --spacing-160` inside `@theme`. In
Tailwind v4 the `--spacing-*` namespace **generates the whole spacing scale**,
so declaring `--spacing-4: 4px` makes `p-4` mean `4px` (not `16px`) and
deletes every unlisted step (`p-5`, `gap-3`, `mt-10`). Keep the colors, fonts,
text sizes and radii in `@theme`; move the `--spacing-*` block to plain
`:root` and reference it as `p-[var(--spacing-32)]` where an exact token is
wanted. Tailwind's default `--spacing: 0.25rem` scale stays intact.

---

## 1. Navbar

**Observed:** white background, full-width, ~68px tall, ~20px side padding.
Sticky — present in every frame including over the dark hero, and it stays
white rather than inverting.

- **Left:** small dark glyph (a filled quadrilateral / folded-corner mark),
  then the wordmark in lowercase, ~20px, weight 400. Gap ~8px.
- **Center-left:** nav links in a row, ~16px, weight 400, `#000000`,
  ~24px gaps: `Products` `Solutions` `Research` `Resources`
- **Right:** `Log In` outlined pill — transparent, `1px solid #c7c7c7`,
  text `#929292`, `8px` radius, padding `8px 16px`, 16px Aeonik 400.
  Then `Book Demo` — filled `#000000`, white text, `8px` radius, same padding.
  Gap between them ~12px.

**HeyArka:**

| Slot | Content |
|---|---|
| Mark | Arka glyph (see §11) + wordmark `heyarka` lowercase |
| Links | `Attacks` · `Shield` · `Scorecard` · `Docs` |
| Secondary | `GitHub` (outlined pill) |
| Primary | `Run the Attack` (filled black) → anchors to the copy-paste command |

Rationale for the link set: they are the four real surfaces of the product —
the 16-vector corpus, `@heyarka/shield`, the 6-metric scorecard, and the
README/ARCHITECTURE docs. No fabricated "Solutions"/"Pricing" pages.

---

## 2. Hero — video carousel

**Observed:** an **inset** full-bleed video, not edge-to-edge — white page
background is visible as a ~20px frame around it, video corners rounded
~16px. Dark overlay tint over the footage so white type reads.

- Headline centered, white, **64px weight 400**, tracking `-0.64px`,
  line-height `1.05`, wrapped to 2 lines, ~640px measure.
- The headline **persists** while the background video **cycles** between
  clips (observed: SF street scene with live bounding boxes labelled
  "Sedan"/"SUV" → aerial oil rig). Crossfade, no slide.
- **Bottom-right:** `Scroll to explore` at 13px mono white, beside a
  `40×40px` square, `1px` white border, `8px` radius, centered down-chevron.
  Anchored ~40px from bottom and right edges of the video frame.

**HeyArka:**

- Headline: **"Every LLM trading agent can be hijacked by a character you can't see."**
  (64px / 400 / -0.64px / 1.05, 2 lines)
- Sub-line under it, 20px `#ffffff` at ~70% opacity:
  *"HeyArka proves it, scores it, and hardens it — in one command."*
- Scroll prompt: `Scroll to explore` — kept verbatim, it's a generic affordance.

**Hero media — the honest version.** Scale uses documentary footage. We have
no equivalent and inventing stock-looking "AI trading" b-roll would be exactly
the slop the project bans. Instead the hero cycles **three real captures**
(see §11 for how they're produced):

1. A terminal running `arka attack --demo` — the vector list streaming past
   with `FLIPPED` / `held` marks, the real output of the real binary.
2. A side-by-side diff of a clean headline vs. its homoglyph twin, with the
   substituted codepoints highlighted — visually identical strings, different
   bytes.
3. The generated HTML report card scrolling, grade `C` → grade `B`.

This is *our* documentary footage. It is the product actually running.

---

## 3. Black void sections (×2, alternating)

**Observed:** full-bleed `#000000`. A stack of translucent **wireframe
panels** in 3D perspective — thin white line contours, dotted connector
lines, tiny mono numeric labels, with a video embedded inside the panel
stack. Text blocks alternate sides between the two instances.

Text block anatomy, top to bottom:
1. Mono micro-label, 11px uppercase, `+0.55px` tracking, preceded by a small
   arrow glyph — e.g. `◤ APPLICATIONS`
2. Heading, ~36px Aeonik 400 white, tracking `-0.36px`
3. Body, 14–16px, graphite-on-black (white at ~60–70%), ~420px measure

Text **fades and rises progressively on scroll** (staggered, ~40px travel).

**HeyArka — instance A (text left, wireframe right):**

- Eyebrow: `◤ THE ATTACK`
- Heading: **"Sixteen vectors. Six families. None of them look like an attack."**
- Body: *"Homoglyph substitution, hidden-text clauses, tool-call hijacks,
  semantic traps, look-ahead probes and sentiment filters — reproduced from
  the published literature and run against your agent in one command."*

**HeyArka — instance B (text right, wireframe left):**

- Eyebrow: `◤ THE SHIELD`
- Heading: **"Five deterministic steps between the headline and the order."**
- Body: *"NFKC normalization and confusables mapping, zero-width and bidi
  stripping, provenance corroboration, a point-in-time guard, and a risk
  contract that can veto any order the model proposes. The LLM never touches
  credentials."*

**Wireframe illustration.** Drawn as **SVG, by hand, from real data** — not
generated art. Instance A is the attack corpus rendered as a node graph: 6
family clusters, 16 leaf nodes, edges weighted by observed flip rate, with
mono numeric labels carrying the actual per-vector numbers. Instance B is the
shield pipeline as a 5-stage schematic with the headline string visibly
transforming at each stage. Thin white strokes (`0.75–1px`), dotted
connectors, `#839cb2` for a single categorical accent stroke. Animated with
`stroke-dasharray`/`stroke-dashoffset` draw-on as it enters the viewport.

---

## 4. Accent stat card + video tile

**Observed:** a `#193a29` forest-green card slides in **from the right**
while a video tile (rounded ~12px, ~290×330px) enters **from the left**.
Card text ~40px, light/white, left-aligned, 3 lines, ~36px padding.
Video tiles carry annotated footage (MRI scan with markers, warehouse robot
POV with a green tracking line, satellite dish).

**HeyArka:**

- Card `#193a29`, text `#ffffff` at 40px / 400 / -0.4px:
  **"31.3% of attacks flipped the unshielded agent's order. With the shield: 12.5%."**
- Caption beneath in 13px mono at 70%: `arka attack --demo · 16 vectors · reproducible offline`
- Video tile (left): a screen capture of that exact A/B run, the two
  scorecards side by side.

Both numbers are already verified in this repo (see Source of Truth).

---

## 5. Floating-thumbnail light panel

**Observed:** an `#eaeaea` panel **rises from below** over the preceding
section. Centered two-line headline ~64px weight 400 where the second line's
key word is `#a8927c` warm sandstone and the rest is black. A white pill
button centered beneath. **~10 thumbnail cards** at varied sizes scatter
around the headline and **drift with parallax** — their positions visibly
change between frames, moving at different rates.

**HeyArka:**

- Headline: **"Adversarial Evaluation."** / **"Real Proof."**
  — with `Real Proof.` in `#a8927c`.
- Button: `Get Started` → white pill, black text, 8px radius, centered.
- The ~10 floating thumbnails are **real artifacts**, each a small rounded
  card: a JSONL audit-log excerpt, the HTML report card, a homoglyph diff, a
  scorecard grade badge, a canary tick line, the MCP tool list, a shield
  veto log line, a vector definition, a terminal `held` run, a risk-contract
  snippet. Parallax on `translate3d` driven by scroll progress, 3 depth
  layers at 0.3×/0.6×/1.0× rates. `prefers-reduced-motion` pins them.

---

## 6. Partner card marquee

**Observed:** horizontally scrolling white cards, ~330px wide, 16px radius,
no shadow, ~32px padding. Each card: a ~44×44px rounded logo chip top-left,
~20px body text, small gray partner name at the bottom (13px, `#575757`).
Cards **bleed off both viewport edges** — the row is wider than the page.
Continuous auto-scroll.

**HeyArka.** We have no partners, and inventing logos would be fabrication.
This slot becomes **"What it runs against"** — the same card geometry, but
each card is a real, honest capability statement:

| Chip | Body | Caption |
|---|---|---|
| Corpus glyph | "Any agent module exporting an `AgentUnderTest`." | `arka attack --agent <path>` |
| Git glyph | "Any public git repo — cloned, attacked, cleaned up." | `arka attack --repo <url> --entry <path>` |
| Shield glyph | "Any agent, wrapped and re-scored in the same run." | `--shielded` |
| MCP glyph | "Claude, Cursor and Codex, over MCP." | `@heyarka/mcp` |
| Canary glyph | "A live Demo-account canary, control vs. shielded." | `@heyarka/canary` |

Chips are mono-stroke SVG glyphs from one geometric family (DESIGN.md:
"no multicolor icon sets"), on `#e5e5e5` bone wash.

---

## 7. Benchmark band — 3 cards

**Observed:** white/near-white band. Left-aligned heading ~40px black
weight 400: *"We set the benchmark for what's possible with AI"*. Below,
**3 cards** on `#f2f2f2`, 16px radius, 32px padding, in a 3-column grid with
~24px gutters. Each card, top to bottom:

1. `~52×52px` white rounded chip (`12px` radius) with a thin-stroke mono-line
   icon (observed: trending-up arrow, bar chart, overlapping circles)
2. ~40px gap
3. Headline, 20px Aeonik 400 black, 2 lines
4. ~32px gap
5. Body, 13px `#575757`, 3 lines
6. ~24px gap
7. `Learn More` — small pill, `#e5e5e5` ground, 13px, 8px radius

**HeyArka:**

| Icon | Headline | Body | Link |
|---|---|---|---|
| Trending-up | "Six metrics, named by the rules themselves." | Injection susceptibility, risk-violation rate, decision consistency, look-ahead contamination, attributable PnL damage, human-takeover rate. | `Scorecard` |
| Bar chart | "Sixteen vectors reproduced from published research." | Built from arXiv:2601.13082 and arXiv:2601.13770 — papers that documented the attacks and shipped no defense. | `Corpus` |
| Overlapping circles | "One command. No API keys. Judges can run it." | `pnpm attack` runs the full corpus against a bundled agent and emits a graded report card offline. | `Quickstart` |

---

## 8. News grid — "the latest"

**Observed:** centered two-line heading ~40px weight 400
(*"From the Lab to the real world. / The latest from Scale."*), then an
**asymmetric bento grid**, ~24px gutters:

- Top-left: tall card, `#f2f2f2` ground, mono tag chip top-left
  (`◤ RESEARCH` — small dark rounded square + 11px uppercase mono label),
  large title 24px at the **bottom** of the card
- Top-right: large `#839cb2` slate-blue card spanning 2 rows — a co-brand
  lockup centered, title beneath at 20px
- Below-left: image card, photo filling the card with `12px` radius inset,
  tag chip overlaid top-left on the image, caption 14px beneath
- Bottom row: two smaller image cards side by side, same anatomy
- Final row: three cards of mixed width

Tag chips are categorical: `RESEARCH`, `COMPANY`, `PUBLIC SECTOR`,
`HEALTHCARE`, `PRODUCT` — chip background colors map to the four accents.

**HeyArka:** same bento geometry, content = **the actual evidence**:

| Tag | Card |
|---|---|
| `◤ CORPUS` | "The sixteen vectors, in full" — links to the vector source |
| `◤ PROOF` | slate-blue hero card: the C → B grade lockup, *"The same agent, attacked twice"* |
| `◤ RESEARCH` | "Adversarial News and Lost Profits — reproduced" (arXiv:2601.13082) |
| `◤ RESEARCH` | "Look-Ahead-Bench — alpha decay as a live probe" (arXiv:2601.13770) |
| `◤ CANARY` | "A live Demo-account A/B, ticking every 15 minutes" |
| `◤ SHIELD` | "What the shield stops — and what it honestly does not" |

The last card matters: the README already documents which semantic vectors
the shield does *not* stop. Putting that on the landing page is the single
strongest credibility signal available and costs nothing.

---

## 9. Sandstone CTA band

**Observed:** full-bleed `#a8927c` warm sandstone band with `24px` rounded
top corners, inset from the page edges by ~20px. Generous vertical padding
(~80–120px).

- Left: heading in **black**, 2 lines, ~40px weight 400:
  *"Our legacy, / your success."*
- Beneath: body 16px black with **inline links tinted `#79648c` dusty iris**
- Then a CTA: black pill, white text, with a **white square chevron button
  fused to its right end** (~32×28px, white ground, black `>` glyph, 6px
  radius, inset ~4px)
- Right: a **line-art illustration in a deeper sandstone tone**, thin
  strokes, abstract geometric/organic form floating in the band

**HeyArka:**

- Heading: **"Break your agent / before the market does."**
- Body: *"Run the corpus against your own agent and see the grade. Then turn
  on the shield and run it again."* — with `the corpus` and `the shield` as
  dusty-iris inline links.
- CTA: `Get Started` + chevron square.
- Right illustration: the Arka glyph exploded into its construction
  geometry — thin `#8a7462` strokes on the sandstone ground.

---

## 10. Footer

**Observed:** `#000000`, begins immediately where the sandstone band ends
(hard edge, no gap). Generous top padding (~130px before the link row).

- **Left rail:** the logo glyph alone, white, ~24px, at the far left
  (x≈20–36px), vertically aligned with the column header row.
- **Link columns:** **5 columns**, starting x≈123px, ~208px apart.
  - Column header: 11px **mono uppercase**, `#929292` smoke, `+0.55px`
    tracking
  - Links: 14px Aeonik 400, `#ffffff`, `~17px` line spacing
  - Observed columns: `PRODUCTS` (3) · `SOLUTIONS` (5) · `COMPANY` (6) ·
    `RESOURCES` (5) · `GUIDES` (6)
- **~100px gap**, then a **giant wordmark statement**: *"Reliable AI for the
  world's most important decisions"* — white, ~116px display weight 400,
  tracking `-1.16px`, line-height `~1.0`, 2 lines, left-aligned, bleeding
  to within ~20px of the left edge. This is the display-size token's only
  appearance on the page.
- **Bottom bar:** left — two `44×44px` social squares (`#212121` ground,
  8px radius, white glyph: LinkedIn, X). Right — two lines of **11px mono
  uppercase** `#929292`: `MANAGE YOUR COOKIE PREFERENCES` /
  `COPYRIGHT © 2026 … ALL RIGHTS RESERVED  TERMS OF USE & PRIVACY POLICY`,
  with the policy links underlined.

**HeyArka footer columns** (4 columns — we have 4 real areas, and padding it
to 5 with invented pages would be slop):

| PRODUCT | CORPUS | PROJECT | RESOURCES |
|---|---|---|---|
| `@heyarka/core` | Homoglyph | README | Quickstart |
| `@heyarka/shield` | Hidden text | ARCHITECTURE | CLI reference |
| `@heyarka/cli` | Tool hijack | Disclosure policy | MCP setup |
| `@heyarka/mcp` | Semantic trap | License (MIT) | arXiv:2601.13082 |
| `@heyarka/canary` | Look-ahead | | arXiv:2601.13770 |
| | Sentiment filter | | |

- Giant wordmark: **"Break the agent before the market does"** — 116px / 400
  / -1.16px, 2 lines.
- Bottom bar: GitHub + X squares left; right, 11px mono uppercase:
  `BUILT FOR THE BITGET AI BASE CAMP HACKATHON S2` /
  `MIT LICENSED · RED-TEAM TOOLING FOR AUTHORIZED TESTING ONLY`.

That second line is the ethical guardrail, stated on the front page.

---

## 11. Assets — how they get made without slop

The user's instruction was explicit: the cards must not be AI slop. Nothing
on this page is generated imagery. Every visual is one of:

1. **Real terminal captures** — `arka attack --demo`, `--shielded`, the
   report card. Recorded at 1280×800, no edits beyond trimming. These are
   the hero clips and several thumbnails.
2. **Hand-authored SVG** — the wireframe illustrations, the mono-stroke
   icons, the Arka glyph and its construction geometry. Drawn to the token
   palette with `0.75–1px` strokes.
3. **Real artifact screenshots** — the HTML report card, JSONL excerpts,
   canary tick lines, code snippets rendered as styled DOM (not images, so
   they stay crisp and selectable).

**The Arka glyph.** Scale's mark is a folded-corner quadrilateral. HeyArka's
is its own: a **shield silhouette whose upper-left corner is folded back**,
revealing a single homoglyph character underneath — the attack hiding behind
the defense. One path, flat fill, works at 16px and at 400px. Authored as
SVG, no generation.

If any capture proves impractical, the fallback is a **styled DOM
recreation** of the same artifact — never a stock image, never a generated
one.

---

## 12. Motion inventory

| # | Element | Motion | Trigger |
|---|---|---|---|
| 1 | Hero video | crossfade between 3 clips, ~6s each | autoplay loop |
| 2 | Hero headline | static, persists across clip changes | — |
| 3 | Nav | sticky, stays white over dark hero | — |
| 4 | Void section text | staggered fade + 40px rise | in-view |
| 5 | Wireframe SVG | `stroke-dashoffset` draw-on | in-view |
| 6 | Accent stat card | slides in from right | scroll progress |
| 7 | Adjacent video tile | slides in from left | scroll progress |
| 8 | Light panel | rises from below over previous section | scroll progress |
| 9 | Floating thumbnails | 3-layer parallax drift | scroll progress |
| 10 | Partner cards | continuous horizontal marquee | autoplay |
| 11 | Benchmark cards | staggered fade-up | in-view |
| 12 | Bento cards | staggered fade-up | in-view |
| 13 | Footer wordmark | fade-up | in-view |

All of it respects `prefers-reduced-motion: reduce` — parallax and marquee
stop, fades become instant, video clips do not autoplay.

---

## 13. Content Source of Truth

Only these figures may appear on the page. Each is already verified in this
repo; re-run before shipping if anything changes.

| Claim | Value | How to re-verify |
|---|---|---|
| Corpus size | 16 vectors, 6 families | `packages/core/src/vectors/*.ts` |
| Unshielded demo grade | `C` | `pnpm attack` |
| Unshielded injection susceptibility | `31.3%` | `pnpm attack` |
| Unshielded risk-violation rate | `25%` | `pnpm attack` |
| Shielded demo grade | `B` | `arka attack --demo --shielded` |
| Shielded injection susceptibility | `12.5%` | same |
| Shielded risk-violation rate | `0%` | same |
| Repo-agent run (separate cloned repo) | grade `B`, `12.5%`, **labelled with its subject** | `arka attack --repo … --entry …` |
| Test count | `134` (core 48, shield 24, cli 29, canary 25, mcp 8) | `pnpm -r test` |
| Canary cadence | tick every 15 min, Demo account only | `node scripts/canary-figures.mjs` |
| Canary agreement rate | `23 of 23` over 57.3h, 16 real Demo orders per account (BTCUSDT); ETHUSDT runs separately in `reports/canary-eth.jsonl` | `node scripts/canary-figures.mjs` |
| Attributable PnL delta | **deliberately not claimed** — see below | README |

**The last two rows are load-bearing.** The page must never display a PnL delta.

The canary is a controlled A/B under identical conditions -- same symbol, same
live feed, same agent, shield the only variable -- so the quantitative finding
is the **agreement rate**, not profit. 23 of 23 agreement over 57.3 hours is a
complete answer to the false-positive question: the shield imposed no cost on
clean input. That is what the page may claim.

A PnL delta additionally requires an adversarial headline to appear organically
in the live feed, which did not happen in the window. It is therefore absent by
circumstance, not pending, and manufacturing the trigger would turn live
evidence into a simulation. The page states this as a deliberate scope boundary
rather than as an outstanding gap.

The repo-agent row must always carry its subject. A susceptibility rate is a
property of the agent under test, so `12.5%` unattributed is meaningless and
unreproducible; the page says "a keyword-sentiment agent in a separate git
repo". An earlier revision of this spec listed `18.8%` from an agent that was
not reproducible from this repo -- corrected 2026-09-16 after re-measuring
against a real git repository.
