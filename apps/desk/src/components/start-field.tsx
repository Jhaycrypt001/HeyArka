/**
 * Background for the entry split.
 *
 * A static, server-rendered field: no client JS, no rAF loop. The footer
 * already carries the animated confusable lattice, and repeating it here would
 * put two competing motion systems on one screen while costing the entry page
 * its zero-JS budget.
 *
 * The grid rules are drawn with a repeating gradient rather than elements, so
 * the whole field is three divs regardless of viewport.
 */
export function StartField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Hairline grid, fading out toward the bottom. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.045) 0 1px, transparent 1px 88px), repeating-linear-gradient(to bottom, rgba(255,255,255,0.045) 0 1px, transparent 1px 88px)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 92%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 45%, transparent 92%)",
        }}
      />

      {/* Sandstone pool behind the left panel, matching the footer's glow. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 22% 38%, rgba(168,146,124,0.16) 0%, transparent 68%)",
        }}
      />

      {/* Keeps the panel edge from reading as a hard seam against the page. */}
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-b from-transparent to-obsidian" />
    </div>
  );
}
