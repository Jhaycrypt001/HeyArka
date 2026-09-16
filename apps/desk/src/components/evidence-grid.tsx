import { TagChip } from "./ui";
import { ArkaGlyph } from "./glyphs";
import { CANARY, PAPERS, REPO_RUN, SHIELDED, UNSHIELDED } from "@/lib/facts";

/**
 * The asymmetric bento grid. In the reference this is a news/blog feed; here
 * it carries the actual evidence, because that is what HeyArka has to show.
 *
 * The final card is deliberate: the README already documents which semantic
 * vectors the shield does NOT stop, and putting that on the landing page is
 * the strongest credibility signal available. A red-team tool that only
 * advertises its wins is not trustworthy.
 */

const ACCENTS = {
  corpus: "#79648c",
  proof: "#839cb2",
  research: "#a8927c",
  canary: "#193a29",
  shield: "#212121",
} as const;

function Card({
  className = "",
  children,
  surface = "mist",
}: {
  className?: string;
  children: React.ReactNode;
  surface?: "mist" | "slate";
}) {
  const bg = surface === "slate" ? "bg-slate-blue" : "bg-soft-mist";
  return (
    <div
      className={`flex flex-col rounded-[var(--radius-cards)] p-[var(--card-padding)] ${bg} ${className}`}
    >
      {children}
    </div>
  );
}

export function EvidenceGrid() {
  return (
    <section id="docs" className="bg-pure-white pb-[var(--spacing-128)]">
      <div className="page-rail">
        <h2
          data-reveal
          className="mx-auto max-w-[760px] text-center text-[clamp(28px,4vw,40px)] leading-[1.25] tracking-[-0.4px] text-obsidian"
        >
          From the corpus to the real world.
          <br />
          The evidence behind HeyArka.
        </h2>

        <div
          data-reveal
          className="mt-[var(--spacing-56)] grid gap-[var(--spacing-24)] lg:grid-cols-2"
        >
          {/*
            Left column. `min-w-0` is required: a grid item defaults to
            `min-width: auto`, so the long mono strings inside these cards set
            an intrinsic minimum wider than the 350px track on a phone and push
            the whole document sideways.
          */}
          <div className="flex min-w-0 flex-col gap-[var(--spacing-24)]">
            <Card className="min-h-[240px] justify-between">
              <TagChip label="Corpus" accent={ACCENTS.corpus} />
              <h3 className="mt-[var(--spacing-40)] text-subheading-sm leading-[1.3] text-obsidian">
                The sixteen vectors, in full
              </h3>
              <p className="mt-[var(--spacing-12)] text-[13px] text-graphite">
                packages/core/src/vectors: six families, every one executable.
              </p>
            </Card>

            <Card className="min-h-[300px] justify-between">
              <TagChip label="Research" accent={ACCENTS.research} />
              <div className="mt-[var(--spacing-40)]">
                {PAPERS.map((paper) => (
                  <div
                    key={paper.id}
                    className="border-t border-bone py-[var(--spacing-16)] first:border-t-0 first:pt-0"
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.55px] text-smoke">
                      {paper.id}
                    </div>
                    <div className="mt-[var(--spacing-8)] text-body-sm text-obsidian">
                      {paper.title}
                    </div>
                    <div className="mt-[var(--spacing-4)] text-[13px] text-graphite">
                      {paper.note}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column — same `min-w-0` reason as the left. */}
          <div className="flex min-w-0 flex-col gap-[var(--spacing-24)]">
            {/* The hero evidence card: the grade lockup. */}
            <Card surface="slate" className="min-h-[360px] justify-between">
              <TagChip label="Proof" accent="#ffffff33" onImage />
              <div className="flex flex-1 items-center justify-center gap-[var(--spacing-32)] py-[var(--spacing-32)]">
                <div className="flex items-center gap-[var(--spacing-12)]">
                  <ArkaGlyph className="h-7 w-7 text-obsidian" />
                  <span className="text-[26px] lowercase text-obsidian">heyarka</span>
                </div>
                <span className="h-10 w-px bg-black/25" />
                <div className="flex items-baseline gap-[var(--spacing-12)]">
                  <span className="text-[44px] leading-none text-obsidian">
                    {UNSHIELDED.grade}
                  </span>
                  <span className="text-[20px] text-black/45">&rarr;</span>
                  <span className="text-[44px] leading-none text-obsidian">
                    {SHIELDED.grade}
                  </span>
                </div>
              </div>
              <p className="text-body leading-[1.4] text-obsidian">
                The same agent, attacked twice: {UNSHIELDED.injectionSusceptibility}{" "}
                flipped unshielded, {SHIELDED.injectionSusceptibility} with the shield on.
              </p>
            </Card>

            <div className="grid gap-[var(--spacing-24)] sm:grid-cols-2">
              <Card className="min-h-[220px] justify-between">
                <TagChip label="Canary" accent={ACCENTS.canary} />
                <div className="mt-[var(--spacing-32)]">
                  <h3 className="text-body-sm leading-[1.4] text-obsidian">
                    A live Demo-account A/B, ticking {CANARY.cadence}
                  </h3>
                  <p className="mt-[var(--spacing-12)] text-[13px] leading-[1.6] text-graphite">
                    {CANARY.divergence}
                  </p>
                </div>
              </Card>

              <Card className="min-h-[220px] justify-between">
                <TagChip label="Shield" accent={ACCENTS.shield} />
                <div className="mt-[var(--spacing-32)]">
                  <h3 className="text-body-sm leading-[1.4] text-obsidian">
                    What the shield stops, and what it honestly does not
                  </h3>
                  <p className="mt-[var(--spacing-12)] text-[13px] leading-[1.6] text-graphite">
                    Sanitizable vectors drop to zero. Semantic traps and
                    sentiment-filter poisoning still get through: {SHIELDED.injectionSusceptibility}{" "}
                    residual, documented rather than hidden.
                  </p>
                </div>
              </Card>
            </div>

            <Card className="min-h-[160px] justify-between">
              <TagChip label="Repo run" accent={ACCENTS.corpus} />
              <div className="mt-[var(--spacing-24)] flex flex-wrap items-baseline gap-[var(--spacing-16)]">
                <span className="text-[32px] leading-none text-obsidian">
                  {REPO_RUN.grade}
                </span>
                <span className="font-mono text-[13px] text-graphite">
                  {REPO_RUN.injectionSusceptibility} injection susceptibility against a
                  genuinely separate cloned git repo
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
