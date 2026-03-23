import { NextResponse } from "next/server";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";
import {
  consumeChallengeSession,
  createVerifiedSession,
} from "@/lib/captcha-session";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v0/captcha/verify
 *
 * Called by the widget after user selects images.
 * Body: { sessionToken: string, selectedIndices: number[] }
 * Returns: { success: boolean, token?: string }
 *
 * Verification logic:
 * - If all 9 selected → auto fail (anti-bot)
 * - Required correct = ceil(correctCount * difficulty)
 * - Currently only checks correct selection count, no wrong penalty
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(rateLimiters.verify, request);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body?.sessionToken || !Array.isArray(body?.selectedIndices)) {
    return NextResponse.json(
      { error: "Missing sessionToken or selectedIndices" },
      { status: 400 },
    );
  }

  const { sessionToken, selectedIndices } = body as {
    sessionToken: string;
    selectedIndices: number[];
  };

  // Deduplicate and validate indices
  const uniqueIndices = [...new Set(selectedIndices)];

  if (
    uniqueIndices.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= CAPTCHA_GRID_SIZE,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid indices" },
      { status: 400 },
    );
  }

  // Reject empty selections
  if (uniqueIndices.length === 0) {
    return NextResponse.json({ success: false });
  }

  // Anti-bot: if all selected, auto fail
  if (uniqueIndices.length === CAPTCHA_GRID_SIZE) {
    return NextResponse.json({ success: false });
  }

  // 1. Atomically consume challenge session (prevents race condition / replay)
  const session = await consumeChallengeSession(sessionToken);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired session" },
      { status: 400 },
    );
  }

  // 2. Verify — map indices to image IDs via session, then check against correct set
  const correctIds = new Set(session.correctImageIds);
  const selectedImageIds = uniqueIndices.map((i) => session.imageIds[i]);

  const selectedCorrectCount = selectedImageIds.filter((id) => correctIds.has(id)).length;
  const requiredCount = Math.max(1, Math.ceil(session.correctCount * session.difficulty));

  if (selectedCorrectCount < requiredCount) {
    return NextResponse.json({ success: false });
  }

  // 3. Create verified session
  const verifyToken = await createVerifiedSession({
    puzzleId: session.puzzleId,
    siteId: session.siteId,
  });

  return NextResponse.json({ success: true, token: verifyToken });
}
