"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Tracks the pointer as a *ref* rather than state.
 *
 * Ported from the reference `use-mouse-position-ref` hook. The reference
 * returns a plain ref updated on every `mousemove`; that is the right shape —
 * a pointer that moves 120 times a second must never enter React's render
 * path — so the contract is kept. Two changes:
 *
 *   - Pointer events instead of mouse events, so pen and touch drag work.
 *   - Coordinates are relative to `containerRef`'s centre when one is given,
 *     and to the viewport centre otherwise. The reference computed absolute
 *     page coordinates and left the centring to each call site; both consumers
 *     here (the proximity text and the tilt card) want centre-relative values,
 *     so doing it once avoids repeating the `getBoundingClientRect` maths.
 *
 * The returned ref is mutated in place: read it inside a rAF loop, never in
 * render.
 */
export function useMousePositionRef(
  containerRef?: RefObject<HTMLElement | null>,
): RefObject<{ x: number; y: number }> {
  const position = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const update = (x: number, y: number) => {
      const el = containerRef?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        position.current = { x: x - rect.left, y: y - rect.top };
      } else {
        position.current = { x, y };
      }
    };

    const onMove = (event: PointerEvent) => update(event.clientX, event.clientY);

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [containerRef]);

  return position;
}
