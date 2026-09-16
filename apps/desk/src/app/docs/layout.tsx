import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DocsNav } from "@/components/docs-nav";

/**
 * Shell for every /docs route: the site navbar, a sticky sidebar, the page
 * body, and the shared footer.
 *
 * The sidebar is sticky under the 68px navbar rather than fixed, so it scrolls
 * away naturally on short pages instead of leaving a stranded rail. Below
 * `lg` it collapses above the content — a docs page on a phone should be
 * readable first and navigable second.
 */
export const metadata: Metadata = {
  title: {
    default: "Docs: HeyArka",
    template: "%s: HeyArka Docs",
  },
  description:
    "Documentation for HeyArka: the attack corpus, the shield, the scorecard metrics, the arka CLI, and the MCP server.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="bg-pure-white">
        <div className="page-rail grid gap-[var(--spacing-48)] py-[var(--spacing-64)] lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:gap-[var(--spacing-64)]">
          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <DocsNav />
          </aside>

          {/* 760px keeps prose near the 70-90 character measure DESIGN.md asks for. */}
          <article className="min-w-0 max-w-[760px] pb-[var(--spacing-64)]">
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
