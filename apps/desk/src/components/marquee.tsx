import {
  IconGitBranch,
  IconPlug,
  IconPulse,
  IconShield,
  IconTerminal,
} from "./glyphs";

/**
 * The reference uses this slot for partner logo cards. HeyArka has no
 * partners, and inventing logos would be fabrication — so the same card
 * geometry (330px, 16px radius, no shadow, 32px padding, logo chip top-left,
 * caption bottom) carries the five real entry points instead.
 */
const CARDS = [
  {
    icon: IconTerminal,
    body: "Any agent module exporting an AgentUnderTest.",
    caption: "arka attack --agent <path>",
  },
  {
    icon: IconGitBranch,
    body: "Any public git repo, cloned, attacked, cleaned up.",
    caption: "arka attack --repo <url> --entry <path>",
  },
  {
    icon: IconShield,
    body: "Any agent, wrapped and re-scored in the same run.",
    caption: "--shielded",
  },
  {
    icon: IconPlug,
    body: "Claude, Cursor and Codex, over MCP.",
    caption: "@heyarka/mcp",
  },
  {
    icon: IconPulse,
    body: "A live Demo-account canary, control vs. shielded.",
    caption: "@heyarka/canary",
  },
];

function CapabilityCard({ card }: { card: (typeof CARDS)[number] }) {
  const Icon = card.icon;
  return (
    <div className="mr-[var(--spacing-24)] flex w-[330px] shrink-0 flex-col rounded-[var(--radius-cards)] bg-pure-white p-[var(--card-padding)]">
      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius-buttons)] bg-bone text-graphite">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-[var(--spacing-32)] flex-1 text-body leading-[1.4] text-obsidian">
        {card.body}
      </p>
      <p className="mt-[var(--spacing-32)] font-mono text-[13px] text-graphite">
        {card.caption}
      </p>
    </div>
  );
}

export function CapabilityMarquee() {
  return (
    <section className="bg-soft-mist py-[var(--spacing-96)]">
      {/*
        The track renders the card set twice so the -50% keyframe lands
        exactly on the seam and the loop is invisible. The duplicate is
        aria-hidden so screen readers hear the list once.
      */}
      <div className="marquee-viewport w-full overflow-hidden">
        <div className="marquee-track">
          <div className="flex">
            {CARDS.map((card) => (
              <CapabilityCard key={card.caption} card={card} />
            ))}
          </div>
          <div className="flex" aria-hidden="true">
            {CARDS.map((card) => (
              <CapabilityCard key={`dup-${card.caption}`} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
