import { IconBarChart, IconOverlap, IconTrendingUp } from "./glyphs";
import { IconChip } from "./ui";
import { AnimatedCard } from "./animated-card";
import { PAPERS, TESTS } from "@/lib/facts";

/**
 * White band, left-aligned 40px heading, three soft-mist cards below.
 * Card anatomy from the reference: 52px white icon chip, ~40px gap, 20px
 * headline, ~32px gap, 13px graphite body, ~24px gap, small pill link.
 */
const CARDS = [
  {
    icon: IconTrendingUp,
    headline: "Six metrics, named by the rules themselves.",
    body: "Injection susceptibility, risk-violation rate, decision consistency, look-ahead contamination, attributable PnL damage and human-takeover rate.",
    link: { label: "Scorecard", href: "#scorecard" },
  },
  {
    icon: IconBarChart,
    headline: "Sixteen vectors reproduced from published research.",
    body: `Built from ${PAPERS[0].id} and ${PAPERS[1].id}, papers that documented the attacks and shipped no defense.`,
    link: { label: "Corpus", href: "#attacks" },
  },
  {
    icon: IconOverlap,
    headline: "One command. No API keys. Judges can run it.",
    body: `pnpm attack runs the full corpus against a bundled agent and emits a graded report card offline. ${TESTS.total} tests back it.`,
    link: { label: "Quickstart", href: "#quickstart" },
  },
];

export function Benchmark() {
  return (
    <section id="scorecard" className="bg-pure-white py-[var(--spacing-128)]">
      <div className="page-rail">
        <h2
          data-reveal
          className="max-w-[760px] text-[clamp(28px,4vw,40px)] leading-[1.25] tracking-[-0.4px] text-obsidian"
        >
          We set the benchmark for what an agent survives
        </h2>

        <div className="mt-[var(--spacing-56)] grid gap-[var(--spacing-24)] md:grid-cols-3">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.link.label}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 110}ms` }}
              >
                {/*
                  `data-reveal` stays on the outer element: it animates
                  `transform` on entry, and the tilt writes `transform` every
                  frame — on the same node the two would fight.
                */}
                <AnimatedCard className="h-full" depth={18}>
                  <div className="flex h-full flex-col rounded-[var(--radius-cards)] bg-soft-mist p-[var(--card-padding)]">
                    <IconChip>
                      <Icon className="h-6 w-6 text-graphite" />
                    </IconChip>
                    <h3 className="mt-[var(--spacing-40)] text-body leading-[1.4] text-obsidian">
                      {card.headline}
                    </h3>
                    <p className="mt-[var(--spacing-32)] flex-1 text-[13px] leading-[1.6] text-graphite">
                      {card.body}
                    </p>
                    <a
                      href={card.link.href}
                      className="mt-[var(--spacing-24)] inline-flex w-fit items-center rounded-[var(--radius-buttons)] bg-bone px-[var(--spacing-12)] py-[var(--spacing-8)] text-[13px] text-obsidian transition-colors duration-200 hover:bg-silhouette"
                    >
                      {card.link.label}
                    </a>
                  </div>
                </AnimatedCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
