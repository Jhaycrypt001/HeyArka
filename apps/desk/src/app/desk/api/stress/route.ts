/**
 * POST /desk/api/stress — runs the real attack corpus against the trader's
 * own submitted thesis.
 *
 * This handler does no simulation. It calls `runStressTest`, which calls the
 * same `runCorpus`/`score` functions as `arka attack --demo`, in this process.
 * Nothing is read from disk, no subprocess is spawned, and no credentials are
 * touched — the harness is pure TypeScript, which is what makes a real attack
 * run safe to expose over HTTP with zero configuration.
 *
 * `force-dynamic` because every submission is different input; there is
 * nothing here to cache.
 */
import { NextResponse } from "next/server";
import { ValidationError, runStressTest, validateThesis } from "@/lib/stress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let thesis;
  try {
    thesis = validateThesis(payload);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  try {
    const report = await runStressTest(thesis);
    return NextResponse.json(report);
  } catch (err) {
    // The harness itself failed — report that honestly rather than returning
    // a plausible-looking empty scorecard, which would be exactly the kind of
    // fabricated result this project exists to detect.
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Stress test failed to complete: ${message}` },
      { status: 500 },
    );
  }
}
