/**
 * The footer's ground: a drifting field of the real homoglyph pairs the
 * corpus attacks with.
 *
 * The brief was explicitly *not* the default dark-gradient-and-blurred-blobs
 * background, so this is made of the project's own subject matter. Every
 * character below is a genuine Unicode confusable — a Cyrillic or Greek
 * codepoint that renders as a Latin letter — paired with the Latin letter it
 * impersonates. These are the substitutions `arka attack` actually performs.
 *
 * Deliberately a server component: the layout is deterministic (a fixed
 * lattice, no randomness), so it needs no client JS at all. Randomised
 * positions would also hydrate-mismatch, which is the usual way this kind of
 * background goes wrong.
 *
 * Motion comes from one CSS keyframe in globals.css; each glyph carries its
 * own duration and delay as custom properties. Under reduced motion the
 * drift stops but the field stays, so the composition is unchanged.
 */

/**
 * Real confusables. The left character is the impostor, the right is the
 * Latin letter it renders as. `code` is the impostor's codepoint, shown in
 * the tooltip so the field is inspectable rather than decorative.
 */
const PAIRS: ReadonlyArray<{ impostor: string; latin: string; code: string }> = [
  { impostor: "А", latin: "A", code: "U+0410" }, // Cyrillic capital A
  { impostor: "Е", latin: "E", code: "U+0415" }, // Cyrillic capital IE
  { impostor: "О", latin: "O", code: "U+041E" }, // Cyrillic capital O
  { impostor: "Р", latin: "P", code: "U+0420" }, // Cyrillic capital ER
  { impostor: "С", latin: "C", code: "U+0421" }, // Cyrillic capital ES
  { impostor: "Т", latin: "T", code: "U+0422" }, // Cyrillic capital TE
  { impostor: "Х", latin: "X", code: "U+0425" }, // Cyrillic capital HA
  { impostor: "Κ", latin: "K", code: "U+039A" }, // Greek capital kappa
  { impostor: "Μ", latin: "M", code: "U+039C" }, // Greek capital mu
  { impostor: "Ν", latin: "N", code: "U+039D" }, // Greek capital nu
  { impostor: "Α", latin: "A", code: "U+0391" }, // Greek capital alpha
  { impostor: "Β", latin: "B", code: "U+0392" }, // Greek capital beta
];

/** Columns of the lattice. More on wide screens; the CSS grid handles the rest. */
const COLUMNS = 18;
const ROWS = 5;

export function FooterField() {
  const cells = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const i = row * COLUMNS + col;
      const pair = PAIRS[i % PAIRS.length]!;

      // Deterministic pseudo-scatter: a coprime stride through the lattice
      // gives an even, non-repeating-looking spread without any randomness,
      // so server and client render identically.
      const phase = ((i * 7) % 23) / 23;
      const duration = 7 + ((i * 5) % 9);
      const delay = phase * duration;

      // Every fifth glyph resolves to its Latin twin — the field is mostly
      // impostors with the occasional clean character, which is exactly the
      // ratio the corpus uses.
      const resolved = i % 5 === 4;
      const peak = resolved ? 0.34 : 0.15 + ((i * 3) % 7) / 40;

      cells.push(
        <span
          key={i}
          title={resolved ? `${pair.latin} · Latin` : `${pair.impostor} · ${pair.code}`}
          className="confusable-glyph select-none text-center font-mono text-[11px] leading-none md:text-[13px]"
          style={{
            color: resolved ? "rgba(168,146,124,0.9)" : "rgba(255,255,255,0.8)",
            ["--dur" as string]: `${duration}s`,
            ["--delay" as string]: `${delay.toFixed(2)}s`,
            ["--peak" as string]: peak.toFixed(3),
          }}
        >
          {resolved ? pair.latin : pair.impostor}
        </span>,
      );
    }
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The character lattice. */}
      <div
        className="absolute inset-x-0 bottom-0 grid h-[62%] w-full content-end gap-y-[var(--spacing-24)] px-[var(--spacing-20)]"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>

      {/* CRT scanline register, matching the wireframes. */}
      <div className="absolute inset-0 footer-scanline opacity-60" />

      {/* Sandstone pool rising from the bottom edge. */}
      <div className="absolute inset-0 footer-glow" />

      {/*
        Fades the field out under the link columns so the navigation stays at
        full contrast — the background must never cost legibility.
      */}
      <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-obsidian via-obsidian to-transparent" />
    </div>
  );
}
