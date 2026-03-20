import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { captchaSession, puzzle, site } from "@/lib/db/app-schema";

/**
 * POST /api/v0/captcha/siteverify
 *
 * Called by the site owner's backend to validate a verification token.
 * Body: { token: string, secretKey: string }
 * Returns: { success: boolean }
 *
 * This is a one-time check — the token is consumed after verification.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.token || !body?.secretKey) {
    return NextResponse.json(
      { success: false, error: "Missing token or secretKey" },
      { status: 400 },
    );
  }

  const { token, secretKey } = body as { token: string; secretKey: string };

  // 1. Find session by token
  const [session] = await db
    .select({
      id: captchaSession.id,
      puzzleId: captchaSession.puzzleId,
      solved: captchaSession.solved,
      expiresAt: captchaSession.expiresAt,
    })
    .from(captchaSession)
    .where(eq(captchaSession.token, token));

  if (!session) {
    return NextResponse.json({ success: false, error: "Invalid token" });
  }

  // 2. Verify secretKey via puzzle → site JOIN (single query)
  const [owner] = await db
    .select({ siteId: site.id })
    .from(puzzle)
    .innerJoin(
      site,
      and(eq(site.id, puzzle.siteId), eq(site.secretKey, secretKey)),
    )
    .where(eq(puzzle.id, session.puzzleId));

  if (!owner) {
    return NextResponse.json({ success: false, error: "Invalid secretKey" });
  }

  // 3. Check if session was solved and not expired
  if (!session.solved) {
    return NextResponse.json({ success: false, error: "Challenge not solved" });
  }

  if (session.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: "Token expired" });
  }

  // 4. Consume the token (delete session so it can't be reused)
  await db.delete(captchaSession).where(eq(captchaSession.id, session.id));

  return NextResponse.json({ success: true });
}
