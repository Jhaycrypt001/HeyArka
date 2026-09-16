/**
 * POST /dashboard/api/inspect
 *
 * Runs the shipped sanitizer over arbitrary text and reports what it found,
 * character by character. This is `@heyarka/shield`'s own `sanitizeText` plus
 * `findConfusables` from `@heyarka/core`, called in-process: the inspector can
 * never report a detection the published library would not make.
 *
 * Safe to expose with no auth because the work is pure string analysis with a
 * bounded input: no network, no filesystem, no credentials, no persistence.
 */
import { NextResponse } from "next/server";
import { INSPECT_MAX_LENGTH, inspect } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const body = payload as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text : null;

  if (text === null) {
    return NextResponse.json({ error: "Field 'text' must be a string." }, { status: 400 });
  }
  // Codepoint length, not UTF-16 length: the inspector walks codepoints, and
  // an astral character would otherwise count double against the limit.
  if (Array.from(text).length > INSPECT_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Text must be ${INSPECT_MAX_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(inspect(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Inspection failed: ${message}` }, { status: 500 });
  }
}
