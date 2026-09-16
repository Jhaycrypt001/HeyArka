# HeyArka — logo direction and prompts

Reference logos studied: **Hexeon** (geometric container + core, where the wordmark's
`x` IS the mark repeated as a letterform) and **Vireon** (a keyhole hidden inside the
`V`, security concept concealed in a letterform, revealed on second look).

What both do, and what we copy — **not** the hexagon, **not** the orange gradient:

> One idea, expressed twice: once as a standalone mark, once hidden inside a letter of
> the wordmark. The viewer decodes it a half-second after reading it. That delay is the
> entire craft.

## The idea we own

HeyArka's product is one sentence: **two characters that look identical but are not.**
Cyrillic `А` (U+0410) against Latin `A` (U+0041). That is a homoglyph, it is the attack
this project exists to detect, and it is already a visual concept — nobody has to
explain it.

So: **the `A` in ARKA is the logo.** Two `A`s sit in the wordmark. One is Latin. One is
Cyrillic. They are drawn nearly identically, with a single deliberate divergence, and
the mark is that divergence isolated.

This beats a shield, a lock, a radar sweep or a bug icon, all of which are what every
other security project uses. It is also honest — it depicts the actual mechanism rather
than a metaphor for safety.

## Non-negotiable brand constraints

From `hey arka DESIGN.md` and `hey arka tokens.json`. A prompt that violates these
produces something that cannot ship on the site.

| Constraint | Value |
|---|---|
| Palette | `#000000` obsidian, `#ffffff` pure white, `#f2f2f2` soft mist, `#e5e5e5` bone, `#575757` graphite |
| Accents (sparing, categorical only) | `#a8927c` warm sandstone, `#193a29` forest sovereignty, `#839cb2` slate blue |
| Type | Aeonik weight **400** for the wordmark — authority from size and tracking, never from bold |
| Tracking | -0.01em to -0.64px, tight |
| Wordmark case | lowercase `heyarka` (matches the site's existing lockup) |
| Geometry | mono-stroke, thin weight, flat fill, no shadow, no bevel, no gloss |
| Forbidden | gradients, glows, 3D, neon, orange-on-black "cyber" styling, multicolor icon sets, generic shields/locks/padlocks/radars/circuit traces |
| Must survive | 16px favicon through 400px hero, pure black on white AND pure white on black |

The existing `ArkaGlyph` (shield with a folded corner) stays valid as a fallback. These
prompts are the upgrade path, not a replacement decision already made.

---

## PROMPT 1 — The Homoglyph A (primary recommendation)

```
Design a minimal, flat vector logo for "heyarka", a security tool that detects
adversarial text attacks on AI trading agents.

THE CONCEPT — this is the whole brief, execute it literally:
The logo is the capital letter A, constructed as TWO overlapping A-forms that are
almost, but not exactly, identical. They represent a Latin "A" (U+0041) and a Cyrillic
"А" (U+0410) — two characters that render identically to the human eye but are
different data. This is a homoglyph attack, the exact thing the product detects.

CONSTRUCTION:
- One A is drawn as a solid, flat, filled triangle-form in pure black (#000000),
  geometrically perfect, apex centered, with a horizontal crossbar.
- The second A sits offset by a hair — 2 to 4 percent of the glyph width, to the
  right and very slightly up — drawn as a thin outline stroke only, 1px at nominal
  size, in graphite (#575757).
- The offset must read as a REGISTRATION ERROR or a printing misalignment, never as a
  designed double-image or a drop shadow. It should make a viewer want to rub their
  eyes. At a glance the mark looks like one A that is slightly out of focus; on
  inspection it resolves into two distinct characters.
- Where the two forms overlap, do not blend, multiply or screen. The outline simply
  crosses the solid. Flat, no transparency effects.
- The counter (the triangular hole inside the A) is where the divergence is most
  visible: the two apexes should NOT share a vertex.

STYLE:
Flat vector. Monochrome: black #000000 and graphite #575757 on white #ffffff. No
gradient, no glow, no shadow, no bevel, no 3D, no neon, no texture. Swiss/International
Typographic Style precision. Geometric, constructed, drawn with a compass and ruler
rather than sketched.

WORDMARK:
Set "heyarka" in lowercase, geometric grotesque (Aeonik, or Inter/Satoshi as
substitute), WEIGHT 400 ONLY — never bold, never semibold. Tight tracking, -0.01em.
The wordmark sits to the right of the mark, optically centered to its x-height, with a
gap equal to the mark's stem width. In the wordmark, the letter "a" in "arka" carries
the same hairline outline ghost as the mark — subtle enough to miss on first read.

DELIVER: the mark alone, the horizontal lockup, and a 16px favicon crop of the mark.
Must be legible at 16px and at 400px. Must work inverted (white on pure black).

DO NOT: use a shield, a padlock, a keyhole, a bug, a radar sweep, a circuit board, a
hexagon, an eye, a crosshair, or any orange-on-black cybersecurity styling. Do not add
a tagline. Do not use more than two colors.
```

**Why this one wins:** it is the only logo in the category that depicts the actual
vulnerability instead of a metaphor for protection. A judge who understands it
remembers it, and explaining it takes one sentence.

---

## PROMPT 2 — The Fold (evolves your existing glyph)

Keeps the concept already shipped in `ArkaGlyph` — a defense with something hidden
under it — but sharpens it from "shield" to "sheet of paper."

```
Design a minimal, flat vector logo for "heyarka", a red-team harness that finds hidden
malicious text inside news feeds before an AI trading agent reads it.

THE CONCEPT:
A clean rectangular sheet — think a page, a headline, a block of text — with its
top-left corner peeled back. Under the peeled corner, a single character is visible
that should not be there. The sheet is the trusted surface; the fold reveals the
payload hiding beneath it.

CONSTRUCTION:
- The sheet: a flat filled rectangle in pure black (#000000), squared corners, no
  radius, occupying the full glyph box.
- The fold: the top-left corner turned back along a 45-degree diagonal, roughly 30
  percent of the width. The underside of the fold is a flat lighter tone (#575757
  graphite) — flat fill only, NO gradient shading and no curl. It reads as folded
  paper purely through the diagonal and the tone change.
- Revealed beneath the fold: a single small glyph in white — a zero-width-space
  symbol, or a bare character outline. It must read as "a hidden character was under
  there," not as decoration.
- The negative space of the fold is a clean triangle. Nothing soft, nothing organic.

STYLE:
Flat vector, two tones plus white. Black #000000, graphite #575757, white #ffffff.
No gradient, no shadow, no gloss, no 3D, no paper texture. Constructed geometry,
Swiss precision, mono-stroke thinking.

WORDMARK:
"heyarka" lowercase, geometric grotesque, WEIGHT 400, tight -0.01em tracking, set to
the right of the mark.

DELIVER: mark alone, horizontal lockup, 16px favicon. Must invert cleanly.

DO NOT: use a padlock, shield outline, keyhole, magnifier, bug, or any orange/neon
cyber styling. No tagline. No third color.
```

---

## PROMPT 3 — Diff Bars (the most "systems tool" of the three)

```
Design a minimal, flat vector logo mark for "heyarka", a tool that runs the same AI
trading agent twice — once undefended, once defended — and reports the difference.

THE CONCEPT:
Two horizontal bars of identical length, stacked with a tight gap, exactly like two
lines in a text diff. The upper bar is solid black and unbroken. The lower bar is
identical EXCEPT that one small segment, about 12 percent of its length and positioned
off-center, is knocked out to white — a gap where something was altered. The mark is
the comparison itself: same input, one changed byte.

CONSTRUCTION:
- Both bars: pure black #000000, perfectly equal length and weight, squared ends.
- Gap between them equal to roughly half a bar height.
- The knockout in the lower bar is a clean rectangular void, hard edges, not a fade.
- Optional: set the knocked-out segment in warm sandstone #a8927c instead of white, as
  the single categorical accent — use this ONLY in the color variant.
- The whole mark should sit comfortably in a square box and read at 16px as "two lines,
  one broken."

STYLE:
Flat vector, monochrome (black on white, invertible to white on black). Absolute
geometric precision. No gradient, no glow, no shadow, no rounded corners, no 3D.
Reads as a diff, a waveform slice, or a redaction — deliberately ambiguous between all
three.

WORDMARK:
"heyarka" lowercase, geometric grotesque, WEIGHT 400, tracking -0.01em, positioned to
the right, optically aligned to the bar stack.

DELIVER: mark alone, horizontal lockup, 16px favicon, and an inverted variant.

DO NOT: shields, locks, bugs, radars, hexagons, crosshairs, circuits, or any
orange-on-black cybersecurity aesthetic. No tagline. Maximum two colors.
```

---

## Which to run

1. **Prompt 1 (Homoglyph A)** — run this first. It is the only one that is unmistakably
   *this* product, and it is the one with the Vireon-style delayed recognition.
2. **Prompt 3 (Diff Bars)** — run second. Strongest at favicon size and the safest bet
   for a dense dashboard chrome.
3. **Prompt 2 (The Fold)** — run third. Closest to what already ships, so it is the
   low-risk option if the other two come back weak.

## Before you accept any result

- Render it at **16px** and squint. If it turns to mud, reject it.
- Invert it to **white on pure black**. If it breaks, reject it.
- Print or view **greyscale**. If it depends on color, reject it.
- Show someone for **two seconds**, then ask what they saw. If they say "shield" or
  "generic tech logo," reject it.
- Check the wordmark weight is **400**. Generators default to bold and it will fight
  every heading on the site.
