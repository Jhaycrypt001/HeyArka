import type { ReactNode } from "react";

/**
 * Shared primitives for the /docs routes.
 *
 * These deliberately reuse the landing page's tokens rather than introducing
 * a second visual language: same type scale, same `--spacing-*` tokens, same
 * flat-surface rule from DESIGN.md (elevation comes from tone, never shadow).
 * A docs site that looked like a different product would read as bolted on.
 *
 * Everything here is a server component — the docs are static text and
 * generated tables, so none of it needs client JS.
 */

/** Page title block at the top of every docs route. */
export function DocsHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
}) {
  return (
    <header className="border-b border-bone pb-[var(--spacing-40)]">
      <div className="font-mono text-micro-label uppercase tracking-[0.55px] text-graphite">
        {eyebrow}
      </div>
      <h1 className="mt-[var(--spacing-16)] text-[clamp(30px,4.4vw,44px)] leading-[1.15] tracking-[-0.44px] text-obsidian">
        {title}
      </h1>
      <div className="mt-[var(--spacing-24)] max-w-[680px] text-body-sm leading-[1.65] text-graphite">
        {intro}
      </div>
    </header>
  );
}

/** A titled section within a docs page. `id` makes it deep-linkable. */
export function DocsSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-[var(--spacing-56)] scroll-mt-[88px]">
      <h2 className="text-subheading-sm leading-[1.3] tracking-[-0.24px] text-obsidian">
        {title}
      </h2>
      <div className="mt-[var(--spacing-20)] flex flex-col gap-[var(--spacing-16)] text-body-sm leading-[1.65] text-graphite">
        {children}
      </div>
    </section>
  );
}

/**
 * Terminal-style code block. `language` is a label only — there is no syntax
 * highlighter, because shipping one for four short snippets would cost more
 * bundle than the whole docs site.
 */
export function CodeBlock({
  children,
  label,
}: {
  children: string;
  label?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-nested-cards)] bg-obsidian">
      {label && (
        <div className="border-b border-white/10 px-[var(--spacing-20)] py-[var(--spacing-12)] font-mono text-[11px] uppercase tracking-[0.55px] text-white/40">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto p-[var(--spacing-20)] font-mono text-[13px] leading-[1.7] text-pure-white">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/** Inline monospace token for identifiers, flags, and file paths. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] bg-soft-mist px-[5px] py-[2px] font-mono text-[0.88em] text-obsidian">
      {children}
    </code>
  );
}

/**
 * Callout for the standing constraints this project genuinely enforces in
 * code — Demo-only trading, env-var-only credentials, consent before
 * attacking anyone else's agent. These are not decoration; each one
 * corresponds to a real guard, and the docs link to where it lives.
 */
export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: "note" | "warning";
  title: string;
  children: ReactNode;
}) {
  const palette =
    tone === "warning"
      ? { bar: "bg-[#a8927c]", surface: "bg-[#a8927c]/[0.08]" }
      : { bar: "bg-[#839cb2]", surface: "bg-[#839cb2]/[0.08]" };

  return (
    <div
      className={`flex gap-[var(--spacing-16)] overflow-hidden rounded-[var(--radius-nested-cards)] ${palette.surface} p-[var(--spacing-20)]`}
    >
      <span className={`mt-[3px] h-full w-[3px] shrink-0 rounded-full ${palette.bar}`} />
      <div>
        <div className="font-mono text-micro-label uppercase tracking-[0.55px] text-obsidian">
          {title}
        </div>
        <div className="mt-[var(--spacing-8)] text-[14px] leading-[1.65] text-graphite">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Definition row used for flags, metrics, and tool parameters. A table would
 * be more semantic, but these lists are two-column and must collapse to one
 * column on a phone without horizontal scroll — a grid does that cleanly.
 */
export function DefList({
  items,
}: {
  items: ReadonlyArray<{ term: string; def: ReactNode }>;
}) {
  return (
    <dl className="flex flex-col divide-y divide-bone border-y border-bone">
      {items.map((item) => (
        <div
          key={item.term}
          className="grid gap-[var(--spacing-8)] py-[var(--spacing-16)] md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-[var(--spacing-24)]"
        >
          <dt className="font-mono text-[13px] leading-[1.5] text-obsidian">{item.term}</dt>
          <dd className="text-[14px] leading-[1.65] text-graphite">{item.def}</dd>
        </div>
      ))}
    </dl>
  );
}
