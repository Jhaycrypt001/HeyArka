import { ButtonWithChevron } from "./ui";

/**
 * The warm-sandstone band: 24px rounded top corners, inset from the page
 * edges, black heading, dusty-iris inline links, and the chevron-fused CTA.
 * The right half carries a line-art illustration in a deeper sandstone tone.
 *
 * The illustration is the Arka glyph exploded into its construction geometry
 * — hand-drawn, consistent with §11's no-generated-art rule.
 */
function ConstructionArt({ className }: { className?: string }) {
  // Deep sandstone-brown rather than a near-tone of the ground: #8a7462 on
  // #a8927c reads as barely a shade darker, so the drawing disappeared.
  const line = "#4a3a2c";
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      fill="none"
      aria-hidden="true"
      stroke={line}
      strokeWidth="1.1"
    >
      {/* Construction grid the glyph is built on. */}
      <g opacity="0.28">
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`gx${i}`} x1={70 + i * 36} y1="30" x2={70 + i * 36} y2="210" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`gy${i}`} x1="70" y1={30 + i * 36} x2="250" y2={30 + i * 36} />
        ))}
      </g>

      {/* The shield outline, at construction scale — the focal line. */}
      <path
        d="M124 48h108v92c0 36-25 67-66 73-41-6-66-37-66-73V72l24-24z"
        strokeWidth="1.8"
      />

      {/* The folded corner, lifted away from the body. */}
      <path d="M124 48v24h-24l24-24z" strokeWidth="1.8" />
      <path d="M124 72 92 40" strokeDasharray="3 4" opacity="0.75" />

      {/* Radii + centre marks, as on a type-drawing sheet. */}
      <circle cx="178" cy="140" r="66" strokeDasharray="2 5" opacity="0.5" />
      <line x1="178" y1="30" x2="178" y2="212" strokeDasharray="2 5" opacity="0.5" />
      <line x1="70" y1="140" x2="286" y2="140" strokeDasharray="2 5" opacity="0.5" />

      {/* Leader line + mono callout, matching the schematic register. */}
      <line x1="232" y1="48" x2="286" y2="26" opacity="0.7" />
      <text
        x="316"
        y="24"
        fill={line}
        fontSize="9"
        fontFamily="var(--font-mono)"
        letterSpacing="0.5"
        textAnchor="end"
      >
        U+0422
      </text>
    </svg>
  );
}

export function CtaBand() {
  return (
    <section className="bg-pure-white px-[var(--spacing-20)]">
      <div className="overflow-hidden rounded-t-[var(--radius-feature-panels)] bg-warm-sandstone">
        <div className="mx-auto grid w-full max-w-[var(--page-max-width)] items-center gap-[var(--spacing-48)] px-[var(--spacing-20)] py-[var(--spacing-96)] lg:grid-cols-[1fr_auto]">
          <div data-reveal>
            <h2 className="max-w-[420px] text-[clamp(28px,4vw,40px)] leading-[1.25] tracking-[-0.4px] text-obsidian">
              Break your agent
              <br />
              before the market does.
            </h2>
            <p className="mt-[var(--spacing-24)] max-w-[420px] text-body-sm leading-[1.6] text-obsidian">
              Run{" "}
              <a href="#attacks" className="text-dusty-iris underline-offset-2 hover:underline">
                the corpus
              </a>{" "}
              against your own agent and see the grade. Then turn on{" "}
              <a href="#shield" className="text-dusty-iris underline-offset-2 hover:underline">
                the shield
              </a>{" "}
              and run it again.
            </p>
            <ButtonWithChevron href="#quickstart" className="mt-[var(--spacing-40)]">
              Get Started
            </ButtonWithChevron>
          </div>

          <ConstructionArt className="hidden h-[240px] w-[320px] shrink-0 justify-self-end lg:block" />
        </div>
      </div>
    </section>
  );
}
