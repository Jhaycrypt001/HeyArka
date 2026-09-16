import { ArkaGlyph, IconGitHub, IconX } from "./glyphs";
import { FooterField } from "./footer-field";

/**
 * Black closing band, measured from frames f01801–f02041:
 *
 *  - logo glyph alone on the far-left rail, aligned with the column headers
 *  - link columns: 11px mono uppercase smoke headers, 14px white links
 *  - ~100px gap, then the 116px display wordmark bleeding left
 *  - bottom bar: 44px social squares left, 11px mono uppercase legal right
 *
 * Four columns, not the reference's five: padding it out would mean inventing
 * pages that don't exist.
 *
 * The reference's own footer ground is flat black. `FooterField` replaces
 * that with the corpus itself — a drifting lattice of the real Unicode
 * confusables the harness attacks with — because a flat black floor under a
 * 116px wordmark is exactly the generic background the brief ruled out.
 */
/**
 * Every link resolves to a page or anchor that exists. The corpus column
 * deep-links into the generated /docs/corpus sections, whose ids are the
 * `AttackFamily` union members — so those anchors are as real as the families
 * themselves. The two papers link to arXiv; the repo links to GitHub.
 */
const COLUMNS: ReadonlyArray<{
  header: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}> = [
  {
    header: "Product",
    links: [
      { label: "@heyarka/core", href: "/docs/corpus" },
      { label: "@heyarka/shield", href: "/docs/shield" },
      { label: "@heyarka/cli", href: "/docs/cli" },
      { label: "@heyarka/mcp", href: "/docs/mcp" },
      { label: "@heyarka/canary", href: "/docs/quickstart" },
    ],
  },
  {
    header: "Corpus",
    links: [
      { label: "Homoglyph", href: "/docs/corpus#homoglyph" },
      { label: "Hidden text", href: "/docs/corpus#hidden-text" },
      { label: "Tool hijack", href: "/docs/corpus#tool-hijack" },
      { label: "Semantic trap", href: "/docs/corpus#semantic-trap" },
      { label: "Look-ahead", href: "/docs/corpus#look-ahead" },
      { label: "Sentiment filter", href: "/docs/corpus#sentiment-filter" },
    ],
  },
  {
    header: "Project",
    links: [
      { label: "Overview", href: "/docs" },
      { label: "Scorecard metrics", href: "/docs/scorecard" },
      { label: "Disclosure policy", href: "/docs/cli#attack" },
      { label: "License (MIT)", href: "https://github.com" },
    ],
  },
  {
    header: "Resources",
    links: [
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "CLI reference", href: "/docs/cli" },
      { label: "MCP setup", href: "/docs/mcp" },
      { label: "arXiv:2601.13082", href: "https://arxiv.org/abs/2601.13082" },
      { label: "arXiv:2601.13770", href: "https://arxiv.org/abs/2601.13770" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-obsidian">
      <FooterField />

      {/* Content sits above the field; the field is inert and aria-hidden. */}
      {/*
        Vertical rhythm scales with the viewport rather than sitting at a fixed
        128/96/96 stack. At desk width that stack read as a 320px void below
        the links, and on a phone it pushed the wordmark off the fold entirely.
      */}
      <div className="relative z-10 mx-auto w-full max-w-[var(--page-max-width)] px-[var(--spacing-20)] pt-[var(--spacing-56)] md:pt-[var(--spacing-96)]">
        <div className="flex flex-col gap-[var(--spacing-48)] lg:flex-row lg:gap-[var(--spacing-64)]">
          {/* Left rail: the glyph alone. */}
          <div className="shrink-0 lg:w-[80px]">
            <ArkaGlyph className="h-6 w-6 text-pure-white" title="HeyArka" />
          </div>

          <nav
            aria-label="Footer"
            className="grid flex-1 gap-[var(--spacing-40)] sm:grid-cols-2 lg:grid-cols-4"
          >
            {COLUMNS.map((column) => (
              <div key={column.header}>
                <h2 className="font-mono text-micro-label uppercase tracking-[0.55px] text-smoke">
                  {column.header}
                </h2>
                <ul className="mt-[var(--spacing-16)] flex flex-col gap-[6px]">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-caption text-pure-white transition-opacity duration-200 hover:opacity-60"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* The display-size wordmark — its only appearance on the page. */}
        <h2
          data-reveal
          className="mt-[var(--spacing-48)] text-[clamp(40px,9vw,116px)] leading-[1] tracking-[-1.16px] text-pure-white md:mt-[var(--spacing-72)]"
        >
          Break the agent
          <br />
          before the market does
        </h2>

        <div className="mt-[var(--spacing-40)] flex flex-col gap-[var(--spacing-24)] border-t border-white/10 py-[var(--spacing-24)] md:mt-[var(--spacing-56)] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-[var(--spacing-12)]">
            <a
              href="https://github.com"
              aria-label="GitHub"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-buttons)] bg-charcoal text-pure-white transition-colors duration-200 hover:bg-graphite"
            >
              <IconGitHub className="h-4 w-4" />
            </a>
            <a
              href="https://x.com"
              aria-label="X"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-buttons)] bg-charcoal text-pure-white transition-colors duration-200 hover:bg-graphite"
            >
              <IconX className="h-4 w-4" />
            </a>
          </div>

          <div className="font-mono text-micro-label uppercase leading-[1.8] tracking-[0.55px] text-smoke md:text-right">
            <p>Built for the Bitget AI Base Camp Hackathon S2</p>
            <p>MIT licensed · Red-team tooling for authorized testing only</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
