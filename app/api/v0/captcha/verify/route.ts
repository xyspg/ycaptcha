import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { captchaSession, puzzle } from "@/lib/db/app-schema";

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

  // 1. Find session (not expired, not already solved)
  const [session] = await db
    .select()
    .from(captchaSession)
    .where(
      and(
        eq(captchaSession.token, sessionToken),
        eq(captchaSession.solved, false),
        gt(captchaSession.expiresAt, new Date()),
      ),
    );

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired session" },
      { status: 400 },
    );
  }

  // 2. Get the puzzle
  const [puzzleData] = await db
    .select()
    .from(puzzle)
    .where(eq(puzzle.id, session.puzzleId));

  if (!puzzleData) {
    return NextResponse.json(
      { success: false, error: "Puzzle not found" },
      { status: 404 },
    );
  }

  // 3. Verify
  const correctIds = new Set(puzzleData.correctImageIds as string[]);

  // Anti-bot: if all 9 selected, auto fail
  if (selectedIds.length === 9) {
    return NextResponse.json({ success: false });
  }

  // Count how many correct images the user selected
  const correctCount = selectedIds.filter((id) => correctIds.has(id)).length;
  const requiredCount = Math.ceil(correctIds.size * puzzleData.difficulty);
  const passed = correctCount >= requiredCount;

  if (!passed) {
    return NextResponse.json({ success: false });
  }

  // 4. Mark session as solved
  await db
    .update(captchaSession)
    .set({ solved: true })
    .where(eq(captchaSession.id, session.id));

  // 5. Return the session token as the verification token
  // (site owner will use this to call siteverify)
  return NextResponse.json({ success: true, token: session.token });
}
