/**
 * POST /dashboard/api/bench
 *
 * Runs one named corpus vector against the reference agent, bare and shielded,
 * and returns both orders plus the payload the vector injected. This is the
 * dashboard's hands-on surface: the caller chooses the attack, and the answer
 * comes from the shipped `runVector`, not from a lookup table.
 *
 * Safe without auth for the same reason the inspector is: the only input is a
 * vector id that must already exist in the bundled corpus, the agent under test
 * is the in-process demo agent, and nothing touches the network, the filesystem
 * or a credential. An unknown id is a 404, never a thrown error.
 */
import { NextResponse } from "next/server";
import { bench } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The longest id in the shipped corpus is 38 characters
 * (`sentiment-filter-manufactured-crowding`). 128 leaves room for vectors added
 * later while still bounding what a caller can make this route read back.
 */
const MAX_VECTOR_ID_LENGTH = 128;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const body = payload as Record<string, unknown> | null;
  const vectorId = typeof body?.vectorId === "string" ? body.vectorId : null;

  if (vectorId === null) {
    return NextResponse.json({ error: "Field 'vectorId' must be a string." }, { status: 400 });
  }

  /*
   * Every real corpus id is a short kebab-case slug, so anything longer is not
   * a near-miss worth a helpful message. Rejecting on length before the lookup
   * keeps an arbitrarily large body from being read back out in the 404 below:
   * echoing unbounded caller input is free response amplification, and the
   * error is more useful without it anyway.
   */
  if (vectorId.length > MAX_VECTOR_ID_LENGTH) {
    return NextResponse.json(
      { error: `Field 'vectorId' must be ${MAX_VECTOR_ID_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    const result = await bench(vectorId);
    if (result === null) {
      return NextResponse.json(
        { error: `No vector with id '${vectorId}' in this corpus.` },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Bench run failed: ${message}` }, { status: 500 });
  }
}
