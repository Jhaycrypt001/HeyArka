"use client";

import { useState } from "react";
import { WordMark } from "./glyphs";
import { ButtonFilled, ButtonOutlined } from "./ui";

/**
 * White, sticky, ~68px tall, 20px side padding. Observed in the reference:
 * the bar stays white even over the dark hero rather than inverting.
 *
 * Link targets are the real surfaces of the product — no invented marketing
 * pages. The section anchors are written root-absolute (`/#attacks`) rather
 * than bare (`#attacks`) so they still resolve when the bar is rendered on
 * `/desk` or a docs route, where a bare fragment would look for a section that
 * does not exist on that page.
 *
 * The bar deliberately does not link `/dashboard` directly. `/start` is the
 * product's entry page and the dashboard is reached from it, so a first-time
 * reader meets the pitch and the live sanitizer before the instrument panel
 * rather than landing cold on a wall of rates they have no frame for.
 */
const LINKS = [
  { label: "Attacks", href: "/#attacks" },
  { label: "Shield", href: "/#shield" },
  { label: "Desk", href: "/desk" },
  { label: "Docs", href: "/docs" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-bone bg-pure-white">
      <nav
        className="mx-auto flex h-[68px] w-full max-w-[var(--page-max-width)] items-center px-[var(--spacing-20)]"
        aria-label="Primary"
      >
        <a href="/#top" className="flex items-center text-obsidian">
          <WordMark size="sm" title="HeyArka" />
        </a>

        <ul className="ml-[var(--spacing-48)] hidden items-center gap-[var(--spacing-24)] md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-body-sm text-obsidian transition-opacity duration-200 hover:opacity-60"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-[var(--spacing-12)] md:flex">
          <ButtonOutlined href="https://github.com">GitHub</ButtonOutlined>
          <ButtonFilled href="/start">Start</ButtonFilled>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="ml-auto flex h-10 w-10 flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span className="block h-px w-5 bg-obsidian" />
          <span className="block h-px w-5 bg-obsidian" />
        </button>
      </nav>

      {open && (
        <div className="border-t border-bone bg-pure-white px-[var(--spacing-20)] pb-[var(--spacing-24)] pt-[var(--spacing-16)] md:hidden">
          <ul className="flex flex-col gap-[var(--spacing-16)]">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-body-sm text-obsidian"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-[var(--spacing-24)] flex items-center gap-[var(--spacing-12)]">
            <ButtonOutlined href="https://github.com">GitHub</ButtonOutlined>
            <ButtonFilled href="/start">Start</ButtonFilled>
          </div>
        </div>
      )}
    </header>
  );
}
