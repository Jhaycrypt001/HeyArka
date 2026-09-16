"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

/**
 * The docs sidebar.
 *
 * A client component for one reason only: it highlights the current route,
 * which needs `usePathname`. Everything else under /docs stays a server
 * component, so this is the entire client cost of the docs site.
 *
 * The route list is the real one — seven pages, each of which exists. There
 * are no "coming soon" entries, because a sidebar link to a 404 is worse
 * than a shorter sidebar.
 */
const SECTIONS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}> = [
  {
    title: "Start",
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/quickstart", label: "Quickstart" },
    ],
  },
  {
    title: "Reference",
    links: [
      { href: "/docs/corpus", label: "Attack corpus" },
      { href: "/docs/shield", label: "Shield" },
      { href: "/docs/scorecard", label: "Scorecard" },
      { href: "/docs/cli", label: "CLI" },
      { href: "/docs/mcp", label: "MCP server" },
    ],
  },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-[var(--spacing-32)]">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="font-mono text-micro-label uppercase tracking-[0.55px] text-graphite">
            {section.title}
          </div>
          <ul className="mt-[var(--spacing-12)] flex flex-col gap-[2px]">
            {section.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`-ml-[var(--spacing-12)] block rounded-[6px] px-[var(--spacing-12)] py-[6px] text-[14px] transition-colors duration-200 ${
                      active
                        ? "bg-soft-mist text-obsidian"
                        : "text-graphite hover:text-obsidian"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
