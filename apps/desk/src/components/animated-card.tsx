"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "./motion";

/**
 * A card that tilts in 3D toward the pointer and springs back on leave.
 *
 * Ported from the reference `animated-card`. The reference uses framer-motion
 * `useSpring` over `rotateX`/`rotateY` motion values. This app has no
 * animation dependency, so the spring is implemented directly: a critically-
 * damped-ish velocity integrator stepped once per rAF. That is what
 * `useSpring` does internally, and for two scalars it is a few lines.
 *
 * Kept from the reference: `preserve-3d`, the `translateZ` lift on the
 * content so it floats above the card face, the pointer-leave spring-back,
 * and the moving specular highlight.
 *
 * The loop only runs while the pointer is over the card or the spring is
 * still settling, so an idle card costs nothing. Under reduced motion the
 * tilt is not registered at all and the card renders flat.
 */

/** Spring constants — stiffness and damping, per second. */
const STIFFNESS = 170;
const DAMPING = 22;

/** Max tilt in degrees at the card's corners. */
const MAX_TILT = 12;

/** Below this the spring is considered settled and the loop stops. */
const REST = 0.01;

export function AnimatedCard({
  children,
  className = "",
  /** Lift of the content above the card face, in px. */
  depth = 20,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  depth?: number;
  glare?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const card = cardRef.current;
    const inner = innerRef.current;
    if (!card || !inner) return;

    // Spring state: current angle and velocity for each axis.
    const state = { rx: 0, ry: 0, vx: 0, vy: 0 };
    const target = { rx: 0, ry: 0 };
    // Normalised pointer position for the glare, 0..1 within the card.
    const glarePos = { x: 0.5, y: 0.5 };

    let frame = 0;
    let last = 0;

    const step = (now: number) => {
      // First frame has no previous timestamp; assume one 60fps tick.
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;

      for (const axis of ["x", "y"] as const) {
        const cur = axis === "x" ? state.rx : state.ry;
        const tgt = axis === "x" ? target.rx : target.ry;
        const vel = axis === "x" ? state.vx : state.vy;

        const accel = (tgt - cur) * STIFFNESS - vel * DAMPING;
        const nextVel = vel + accel * dt;
        const nextVal = cur + nextVel * dt;

        if (axis === "x") {
          state.vx = nextVel;
          state.rx = nextVal;
        } else {
          state.vy = nextVel;
          state.ry = nextVal;
        }
      }

      inner.style.transform = `rotateX(${state.rx.toFixed(3)}deg) rotateY(${state.ry.toFixed(3)}deg)`;

      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(circle at ${(glarePos.x * 100).toFixed(1)}% ${(glarePos.y * 100).toFixed(1)}%, rgba(255,255,255,0.16), transparent 55%)`;
      }

      // Stop once the spring has settled at its target, so an untouched card
      // is not burning a rAF slot forever.
      const settled =
        Math.abs(state.rx - target.rx) < REST &&
        Math.abs(state.ry - target.ry) < REST &&
        Math.abs(state.vx) < REST &&
        Math.abs(state.vy) < REST;

      if (settled && target.rx === 0 && target.ry === 0) {
        inner.style.transform = "rotateX(0deg) rotateY(0deg)";
        frame = 0;
        last = 0;
        return;
      }

      frame = requestAnimationFrame(step);
    };

    const ensureRunning = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      glarePos.x = px;
      glarePos.y = py;
      // Pointer above centre tips the top toward the viewer -> positive
      // rotateX; pointer right tips the right edge away -> positive rotateY.
      target.rx = (0.5 - py) * MAX_TILT * 2;
      target.ry = (px - 0.5) * MAX_TILT * 2;
      ensureRunning();
    };

    const onLeave = () => {
      target.rx = 0;
      target.ry = 0;
      glarePos.x = 0.5;
      glarePos.y = 0.5;
      ensureRunning();
    };

    card.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ perspective: "900px" }}
    >
      <div
        ref={innerRef}
        className="relative h-full w-full will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(0deg) rotateY(0deg)",
        }}
      >
        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] rounded-[inherit]"
          />
        )}
        <div
          className="relative h-full w-full"
          style={{ transform: `translateZ(${depth}px)`, transformStyle: "preserve-3d" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
