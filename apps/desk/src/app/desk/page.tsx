import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DeskWorkbench } from "@/components/desk-workbench";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Decision Stress Testing: HeyArka Desk",
  description:
    "Paste a trade thesis and watch all 16 corpus attack vectors run against your own headlines, bare and shielded.",
};

/**
 * The Desk's stress-testing workbench.
 *
 * Everything below the fold is produced by a real corpus run against the
 * trader's own submitted context — the same `runCorpus` that backs
 * `arka attack`, called in-process by the route handler. The page states
 * plainly what is being tested and what is not, because a red-team tool that
 * overstates its own scope has no business scoring anyone else's honesty.
 */
export default function DeskPage() {
  return (
    <>
      <Navbar />
      <main className="page-rail pb-[var(--spacing-128)] pt-[var(--spacing-64)]">
        <header className="max-w-[760px]">
          <Eyebrow>Decision Stress Testing</Eyebrow>
          <h1 className="mt-[var(--spacing-24)] text-heading-sm md:text-heading-lg">
            Your thesis, attacked sixteen ways.
          </h1>
          <p className="mt-[var(--spacing-24)] text-body text-graphite">
            Enter the symbol, price and headlines you are trading on. The full attack corpus
            runs against that exact context twice, once against a bare agent, once with{" "}
            <span className="font-mono text-obsidian">@heyarka/shield</span> in front of it,
            and every mutation is shown against your own words.
          </p>
        </header>

        {/* Scope, stated before the results rather than after them. */}
        <div className="mt-[var(--spacing-40)] max-w-[760px] rounded-[var(--radius-nested-cards)] border border-bone p-[var(--spacing-24)]">
          <div className="font-mono text-micro-label uppercase tracking-[0.55px] text-smoke">
            What this does and does not test
          </div>
          <ul className="mt-[var(--spacing-16)] flex flex-col gap-[var(--spacing-8)] text-[13px] leading-[1.6] text-graphite">
            <li>
              The agent under test is the bundled deterministic sentiment agent, not your
              production model. It is deliberately naive, the class of agent the published
              attacks target.
            </li>
            <li>
              No PnL is claimed. The scorecard measures whether an attack changed the order,
              not whether the order would have made money.
            </li>
            <li>
              Nothing is stored, nothing leaves this server, and no API key is needed. Run{" "}
              <span className="font-mono text-obsidian">arka attack --demo</span> to reproduce
              the default result in a terminal.
            </li>
          </ul>
        </div>

        <div className="mt-[var(--spacing-64)]">
          <DeskWorkbench />
        </div>
      </main>
      <Footer />
    </>
  );
}
