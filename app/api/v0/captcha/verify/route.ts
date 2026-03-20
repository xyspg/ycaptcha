import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { captchaSession, puzzle } from "@/lib/db/app-schema";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

/**
 * POST /api/v0/captcha/verify
 *
 * Called by the widget after user selects images.
 * Body: { sessionToken: string, selectedIds: string[] }
 * Returns: { success: boolean, token?: string }
 *
 * Verification logic:
 * - If all 9 selected → auto fail (anti-bot)
 * - Required correct = ceil(correctImageIds.length * difficulty)
 * - Currently only checks correct selection count, no wrong penalty
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.sessionToken || !Array.isArray(body?.selectedIds)) {
    return NextResponse.json(
      { error: "Missing sessionToken or selectedIds" },
      { status: 400 },
    );
  }

  const { sessionToken, selectedIds } = body as {
    sessionToken: string;
    selectedIds: string[];
  };

  // 1. Find session + puzzle in one query
  const [row] = await db
    .select({
      sessionId: captchaSession.id,
      sessionToken: captchaSession.token,
      correctImageIds: puzzle.correctImageIds,
      difficulty: puzzle.difficulty,
    })
    .from(captchaSession)
    .innerJoin(puzzle, eq(puzzle.id, captchaSession.puzzleId))
    .where(
      and(
        eq(captchaSession.token, sessionToken),
        eq(captchaSession.solved, false),
        gt(captchaSession.expiresAt, new Date()),
      ),
    );

  if (!row) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired session" },
      { status: 400 },
    );
  }

  // 2. Verify
  const correctIds = new Set(row.correctImageIds as string[]);

  // Anti-bot: if all selected, auto fail
  if (selectedIds.length === CAPTCHA_GRID_SIZE) {
    return NextResponse.json({ success: false });
  }

  const correctCount = selectedIds.filter((id) => correctIds.has(id)).length;
  const requiredCount = Math.ceil(correctIds.size * row.difficulty);

  if (correctCount < requiredCount) {
    return NextResponse.json({ success: false });
  }

  // 3. Mark session as solved
  await db
    .update(captchaSession)
    .set({ solved: true })
    .where(eq(captchaSession.id, row.sessionId));

  return NextResponse.json({ success: true, token: row.sessionToken });
}
