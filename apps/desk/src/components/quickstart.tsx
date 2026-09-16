import { Eyebrow } from "./ui";
import { EvidenceBadge } from "./evidence-badge";
import { UNSHIELDED, SHIELDED, TESTS } from "@/lib/facts";

/**
 * The copy-paste proof path. Judges will run exactly this, so the commands
 * are the real ones and the printed output matches a genuine run — see
 * LANDING-SPEC.md §13.
 */
const STEPS = [
  {
    n: "01",
    command: "pnpm install && pnpm build",
    note: "No API keys. Nothing phones home.",
  },
  {
    n: "02",
    command: "pnpm attack",
    note: `16 vectors against the bundled agent: grade ${UNSHIELDED.grade}, ${UNSHIELDED.injectionSusceptibility} flipped.`,
  },
  {
    n: "03",
    command: "node packages/cli/dist/bin.js attack --demo --shielded",
    note: `The same agent behind the shield: grade ${SHIELDED.grade}, ${SHIELDED.injectionSusceptibility} flipped.`,
  },
];

export function Quickstart() {
  return (
    <section id="quickstart" className="bg-pure-white pb-[var(--spacing-128)]">
      <div className="page-rail">
        <div data-reveal>
          <Eyebrow>Quickstart</Eyebrow>
          <h2 className="mt-[var(--spacing-24)] max-w-[620px] text-[clamp(28px,4vw,40px)] leading-[1.25] tracking-[-0.4px] text-obsidian">
            Three commands, offline, on any machine with Node 20.
          </h2>
          {/* Hover (or tap) to fan out what the three commands actually run. */}
          <EvidenceBadge className="mt-[var(--spacing-32)]" />
        </div>

        <div className="mt-[var(--spacing-48)] overflow-hidden rounded-[var(--radius-cards)] bg-obsidian">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 100}ms` }}
              className="flex flex-col gap-[var(--spacing-8)] border-b border-white/10 p-[var(--card-padding)] last:border-b-0 md:flex-row md:items-center md:gap-[var(--spacing-32)]"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.55px] text-white/35">
                {step.n}
              </span>
              <code className="flex-1 font-mono text-[clamp(12px,1.3vw,15px)] text-pure-white">
                {step.command}
              </code>
              <span className="font-mono text-[12px] text-white/45 md:text-right">
                {step.note}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-[var(--spacing-24)] font-mono text-[12px] text-graphite">
          {TESTS.total} tests across {TESTS.byPackage.length} packages ·{" "}
          {TESTS.byPackage.map((p) => `${p.name.replace("@heyarka/", "")} ${p.count}`).join(" · ")}
        </p>
      </div>
    </section>
  );
}
