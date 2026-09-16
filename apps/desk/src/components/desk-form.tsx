"use client";

import { useState } from "react";
import type { StressReport } from "@/lib/stress";
import { Eyebrow } from "./ui";

/**
 * The thesis input form. What the trader types here becomes a real
 * `MarketContext` and is genuinely attacked by all 16 corpus vectors — the
 * headlines below are their words, mutated by the same code path as
 * `arka attack`.
 *
 * The defaults are the CLI's own demo context, so a judge who submits without
 * editing anything gets exactly the C -> B result the landing page claims,
 * and can verify it against `arka attack --demo` in a terminal.
 */

const DEFAULTS = {
  symbol: "TSLA",
  price: "250.12",
  headlines: [
    "TSLA delivers quarterly results in line with analyst estimates",
    "Fed holds interest rates steady, signals no near-term change",
  ],
};

const MAX_HEADLINES = 6;

export function DeskForm({
  onReport,
  onPending,
}: {
  onReport: (report: StressReport | null) => void;
  onPending: (pending: boolean) => void;
}) {
  const [symbol, setSymbol] = useState(DEFAULTS.symbol);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [headlines, setHeadlines] = useState<string[]>(DEFAULTS.headlines);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateHeadline(index: number, value: string) {
    setHeadlines((prev) => prev.map((h, i) => (i === index ? value : h)));
  }

  function addHeadline() {
    setHeadlines((prev) => (prev.length < MAX_HEADLINES ? [...prev, ""] : prev));
  }

  function removeHeadline(index: number) {
    setHeadlines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    onPending(true);
    onReport(null);

    try {
      const response = await fetch("/desk/api/stress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          price: Number(price),
          headlines: headlines.filter((h) => h.trim().length > 0),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Stress test failed.");
        return;
      }
      onReport(data as StressReport);
    } catch {
      setError("Could not reach the stress-test endpoint.");
    } finally {
      setBusy(false);
      onPending(false);
    }
  }

  const field =
    "w-full rounded-[var(--radius-buttons)] border border-silhouette bg-pure-white px-[var(--spacing-16)] py-[var(--spacing-12)] text-body-sm text-obsidian outline-none transition-colors duration-200 placeholder:text-smoke focus:border-graphite";
  const label = "font-mono text-micro-label uppercase tracking-[0.55px] text-graphite";

  return (
    <form onSubmit={submit} className="flex flex-col gap-[var(--spacing-24)]">
      <Eyebrow>Your thesis</Eyebrow>

      <div className="grid gap-[var(--spacing-16)] sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-[var(--spacing-8)]">
          <label htmlFor="desk-symbol" className={label}>
            Symbol
          </label>
          <input
            id="desk-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            maxLength={20}
            required
            className={field}
            placeholder="TSLA"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-[var(--spacing-8)]">
          <label htmlFor="desk-price" className={label}>
            Price
          </label>
          <input
            id="desk-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            required
            className={field}
            placeholder="250.12"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[var(--spacing-12)]">
        <span className={label}>Headlines you are reading</span>
        {headlines.map((headline, i) => (
          <div key={i} className="flex min-w-0 items-start gap-[var(--spacing-8)]">
            <textarea
              value={headline}
              onChange={(e) => updateHeadline(i, e.target.value)}
              maxLength={300}
              rows={2}
              className={`${field} resize-none`}
              placeholder="Paste a headline you are trading on"
              aria-label={`Headline ${i + 1}`}
            />
            {headlines.length > 1 && (
              <button
                type="button"
                onClick={() => removeHeadline(i)}
                aria-label={`Remove headline ${i + 1}`}
                className="mt-[var(--spacing-8)] shrink-0 rounded-[var(--radius-buttons)] border border-silhouette px-[var(--spacing-12)] py-[var(--spacing-8)] font-mono text-[11px] text-smoke transition-colors duration-200 hover:border-graphite hover:text-obsidian"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        {headlines.length < MAX_HEADLINES && (
          <button
            type="button"
            onClick={addHeadline}
            className="self-start font-mono text-[11px] uppercase tracking-[0.55px] text-graphite underline underline-offset-4 transition-colors duration-200 hover:text-obsidian"
          >
            + Add headline
          </button>
        )}
      </div>

      {error !== null && (
        <p role="alert" className="text-[13px] text-warm-sandstone">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center self-start rounded-[var(--radius-buttons)] bg-obsidian px-[var(--spacing-32)] py-[var(--spacing-12)] text-body-sm text-pure-white transition-colors duration-200 hover:bg-charcoal disabled:opacity-55"
      >
        {busy ? "Running 32 attack runs…" : "Run stress test"}
      </button>

      <p className="text-[13px] leading-[1.6] text-graphite">
        Runs all 16 corpus vectors twice against your input, once bare, once
        through <span className="font-mono">@heyarka/shield</span>, in this
        process. No API key, no data leaves the server, nothing is stored.
      </p>
    </form>
  );
}
