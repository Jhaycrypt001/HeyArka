"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Adds [data-revealed] to every [data-reveal] element once it enters the
 * viewport. The CSS in globals.css does the actual animating, so elements
 * stay visible if this never runs (JS disabled, hydration failure) only
 * because reduced-motion users get the final state by default — for everyone
 * else we also force-reveal on observer failure below.
 */
export function RevealProvider({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));

    // Safety: if IntersectionObserver is unavailable, show everything rather
    // than leaving the page blank.
    if (typeof IntersectionObserver === "undefined") {
      for (const el of targets) el.setAttribute("data-revealed", "");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "");
            observer.unobserve(entry.target);
          }
        }
      },
      // Fire slightly before the element is fully on screen so the motion
      // reads as part of the scroll rather than a late pop.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={rootRef}>{children}</div>;
}

/** True when the user has asked for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Returns 0→1 progress as `ref`'s element travels through the viewport:
 * 0 when its top edge first reaches the bottom of the screen, 1 once its
 * bottom edge has passed the top. Drives the parallax and slide-in sections.
 *
 * Reads are batched into rAF so scrolling stays on one layout pass.
 */
export function useScrollProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      // Pin to the mid-point: every parallax consumer treats 0.5 as "resting",
      // so the composition lands in its neutral, fully-legible state.
      setProgress(0.5);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const span = rect.height + viewport;
      if (span <= 0) return;
      const travelled = viewport - rect.top;
      setProgress(Math.min(1, Math.max(0, travelled / span)));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, reduced]);

  return progress;
}
