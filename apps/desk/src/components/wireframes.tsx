/**
 * Hand-authored SVG schematics — thin white line-work on pure black, per
 * DESIGN.md's imagery register ("technical schematic rather than
 * decoration"). Drawn from real data, not invented geometry:
 *
 *  - CorpusWireframe plots the actual 6 families and 16 vectors, with each
 *    family's real flip count from the unshielded run in a mono label.
 *
 * The shield's five stages used to live here too, as a static schematic. They
 * now animate — a headline is rewritten stage by stage — which needs client
 * state, so they moved to `shield-pipeline.tsx`.
 *
 * Paths carry `--path-length` so the `.draw-path` rule in globals.css can
 * draw them on when the section reveals.
 */

import { UNSHIELDED } from "@/lib/facts";

const STROKE = "rgba(255,255,255,0.55)";
const STROKE_DIM = "rgba(255,255,255,0.22)";
const ACCENT = "#839cb2";

export function CorpusWireframe({ className }: { className?: string }) {
  // Six families fanned across a perspective plane, sized by vector count.
  const families = UNSHIELDED.families.map((f, i) => {
    const t = i / (UNSHIELDED.families.length - 1);
    return {
      ...f,
      x: 60 + t * 400,
      // Gentle arc so the row reads as a plane in perspective, not a list.
      y: 150 + Math.sin(t * Math.PI) * -46,
    };
  });

  return (
    <svg
      viewBox="0 0 520 340"
      className={className}
      fill="none"
      role="img"
      aria-label="The attack corpus: six families, sixteen vectors, with observed flip counts"
    >
      {/* Perspective floor grid. */}
      <g stroke={STROKE_DIM} strokeWidth="0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} x1="30" y1={232 + i * 15} x2="490" y2={232 + i * 15} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={30 + i * 57.5}
            y1="232"
            x2={110 + i * 37.5}
            y2="322"
          />
        ))}
      </g>

      {/* Source node: the incoming headline. */}
      <g>
        <rect
          x="222"
          y="24"
          width="76"
          height="26"
          rx="4"
          stroke={STROKE}
          strokeWidth="0.75"
          className="draw-path"
          style={{ ["--path-length" as string]: "204" }}
        />
        <text
          x="260"
          y="41"
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize="8"
          fontFamily="var(--font-mono)"
          letterSpacing="0.5"
        >
          HEADLINE
        </text>
      </g>

      {/* Dotted connectors from the source down to each family cluster. */}
      <g stroke={STROKE_DIM} strokeWidth="0.6" strokeDasharray="2 3">
        {families.map((f) => (
          <line key={`c${f.label}`} x1="260" y1="50" x2={f.x} y2={f.y - 16} />
        ))}
      </g>

      {/* Family clusters. */}
      {families.map((f, i) => {
        const flipped = f.succeeded > 0;
        return (
          <g key={f.label}>
            <circle
              cx={f.x}
              cy={f.y}
              r="15"
              stroke={flipped ? ACCENT : STROKE}
              strokeWidth="0.75"
              className="draw-path"
              style={{
                ["--path-length" as string]: "95",
                ["--draw-delay" as string]: `${i * 110}ms`,
              }}
            />
            {/* Leaf vectors: one tick per vector in the family. */}
            {Array.from({ length: f.total }, (_, k) => {
              const angle = (-90 + (k - (f.total - 1) / 2) * 30) * (Math.PI / 180);
              return (
                <line
                  key={k}
                  x1={f.x + Math.cos(angle) * 15}
                  y1={f.y + Math.sin(angle) * 15}
                  x2={f.x + Math.cos(angle) * 27}
                  y2={f.y + Math.sin(angle) * 27}
                  stroke={k < f.succeeded ? ACCENT : STROKE_DIM}
                  strokeWidth="0.75"
                />
              );
            })}
            {/* Real numbers, in mono, as on the reference schematics. */}
            <text
              x={f.x}
              y={f.y + 4}
              textAnchor="middle"
              fill={flipped ? ACCENT : "rgba(255,255,255,0.65)"}
              fontSize="8.5"
              fontFamily="var(--font-mono)"
            >
              {f.succeeded}/{f.total}
            </text>
            <text
              x={f.x}
              y={f.y + 34}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize="6.5"
              fontFamily="var(--font-mono)"
              letterSpacing="0.4"
            >
              {f.label.split(" ")[0].toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Translucent panel floating over the plane, as in the reference. */}
      <rect
        x="150"
        y="196"
        width="220"
        height="66"
        rx="3"
        fill="rgba(255,255,255,0.03)"
        stroke={STROKE_DIM}
        strokeWidth="0.5"
      />
      <text
        x="260"
        y="234"
        textAnchor="middle"
        fill="rgba(255,255,255,0.55)"
        fontSize="9"
        fontFamily="var(--font-mono)"
        letterSpacing="0.5"
      >
        {UNSHIELDED.injectionSusceptibility} FLIPPED · {UNSHIELDED.vectorsRun} VECTORS
      </text>
    </svg>
  );
}

