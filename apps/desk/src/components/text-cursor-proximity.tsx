"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "./motion";
import { useMousePositionRef } from "./use-mouse-position-ref";

/**
 * Per-letter styling driven by how close the cursor is to each letter.
 *
 * Ported from the reference `text-cursor-proximity` component. The reference
 * wraps every character in a `motion.span` and drives it with a `motion/react`
 * spring; this app has no animation dependency, and adding one for a text
 * effect would cost more than the effect. Differences:
 *
 *   - One rAF loop writes styles straight to the character spans via refs.
 *     React never re-renders on pointer movement, so a 60-character headline
 *     costs one loop instead of 60 reconciliations per frame.
 *   - The spring is replaced by exponential smoothing toward the target
 *     (`SMOOTHING` per frame), which for a 0→1 proximity value is visually
 *     the same settle and far cheaper.
 *   - The reference's `falloff` modes are all kept: "linear", "exponential"
 *     and "gaussian".
 *
 * Under `prefers-reduced-motion` the effect is not registered at all and the
 * text renders in its resting style.
 */

export type Falloff = "linear" | "exponential" | "gaussian";

/** Per-frame approach rate toward the target proximity, 0..1. */
const SMOOTHING = 0.18;

/** Below this, a letter is treated as fully at rest and left alone. */
const EPSILON = 0.001;

function falloffValue(distance: number, radius: number, falloff: Falloff): number {
  // Outside the radius nothing happens, so every mode is clamped to 0 first.
  const t = Math.max(0, 1 - distance / radius);
  switch (falloff) {
    case "exponential":
      return t * t;
    case "gaussian":
      // Standard Gaussian with sigma = radius/2, normalised to 1 at d=0.
      return Math.exp(-(distance * distance) / (2 * (radius / 2) ** 2));
    case "linear":
    default:
      return t;
  }
}

export function TextCursorProximity({
  label,
  className = "",
  radius = 140,
  falloff = "gaussian",
  /** Style at rest — what a letter looks like with the cursor far away. */
  from = { color: "rgba(255,255,255,0.45)", scale: 1, letterSpacing: "0px" },
  /** Style at full proximity — the cursor sitting on the letter. */
  to = { color: "#a8927c", scale: 1.32, letterSpacing: "1.5px" },
}: {
  label: string;
  className?: string;
  radius?: number;
  falloff?: Falloff;
  from?: { color: string; scale: number; letterSpacing: string };
  to?: { color: string; scale: number; letterSpacing: string };
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mouse = useMousePositionRef(containerRef);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    // Current smoothed proximity per character, persisting across frames.
    const current: number[] = charRefs.current.map(() => 0);
    let frame = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const parsePx = (v: string) => Number.parseFloat(v) || 0;
    const fromSpacing = parsePx(from.letterSpacing);
    const toSpacing = parsePx(to.letterSpacing);

    const tick = () => {
      const container = containerRef.current;
      if (!container) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const { x: mx, y: my } = mouse.current;

      for (let i = 0; i < charRefs.current.length; i++) {
        const el = charRefs.current[i];
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        // Character centre, in the same container-relative space the mouse
        // hook reports.
        const cx = rect.left - containerRect.left + rect.width / 2;
        const cy = rect.top - containerRect.top + rect.height / 2;
        const distance = Math.hypot(mx - cx, my - cy);

        const target = falloffValue(distance, radius, falloff);
        const prev = current[i] ?? 0;
        const next = lerp(prev, target, SMOOTHING);
        current[i] = next;

        // Skip the write entirely once a letter has settled at rest.
        if (next < EPSILON && prev < EPSILON) continue;

        el.style.color = next < 0.01 ? from.color : mixColor(from.color, to.color, next);
        el.style.transform = `scale(${lerp(from.scale, to.scale, next)})`;
        el.style.letterSpacing = `${lerp(fromSpacing, toSpacing, next)}px`;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mouse, radius, falloff, reduced, from, to]);

  const restStyle: CSSProperties = {
    color: from.color,
    transform: `scale(${from.scale})`,
    letterSpacing: from.letterSpacing,
  };

  return (
    <span ref={containerRef} className={`inline-block ${className}`} aria-label={label}>
      {label.split("").map((char, i) => (
        <span
          key={`${char}-${i}`}
          ref={(el) => {
            charRefs.current[i] = el;
          }}
          aria-hidden="true"
          className="inline-block will-change-transform"
          style={restStyle}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}

/**
 * Blends two CSS colors. Handles the `#rrggbb` and `rgba(...)` forms this
 * project's tokens actually use — not a general CSS color parser, because
 * accepting a form it cannot parse and silently returning the wrong color
 * would be worse than the narrow contract.
 */
function mixColor(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return t > 0.5 ? b : a;
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  const al = ca[3] + (cb[3] - ca[3]) * t;
  return `rgba(${r},${g},${bl},${al.toFixed(3)})`;
}

function parseColor(input: string): [number, number, number, number] | null {
  const s = input.trim();

  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0]! + hex[0]!, 16);
      const g = Number.parseInt(hex[1]! + hex[1]!, 16);
      const b = Number.parseInt(hex[2]! + hex[2]!, 16);
      return [r, g, b, 1];
    }
    if (hex.length === 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
        1,
      ];
    }
    return null;
  }

  const match = s.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1]!.split(",").map((p) => Number.parseFloat(p.trim()));
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
}
