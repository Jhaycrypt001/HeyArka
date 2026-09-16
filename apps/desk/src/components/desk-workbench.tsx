"use client";

import { useState } from "react";
import type { StressReport } from "@/lib/stress";
import { DeskForm } from "./desk-form";
import { DeskResults } from "./desk-results";
import { Eyebrow } from "./ui";

/**
 * Owns the report state and switches between the three states the page can be
 * in: waiting for input, running, and showing results. Kept separate from the
 * route's page component so the page itself stays a server component.
 */
export function DeskWorkbench() {
  const [report, setReport] = useState<StressReport | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col gap-[var(--spacing-64)]">
      <div className="rounded-[var(--radius-cards)] bg-soft-mist p-[var(--spacing-32)] md:p-[var(--spacing-40)]">
        <DeskForm onReport={setReport} onPending={setPending} />
      </div>

      {pending && (
        <div className="flex flex-col gap-[var(--spacing-16)]">
          <Eyebrow>Running</Eyebrow>
          <p className="text-body-sm text-graphite">
            16 vectors against your context, bare. Then 16 again through the shield.
          </p>
        </div>
      )}

      {report !== null && !pending && <DeskResults report={report} />}
    </div>
  );
}
