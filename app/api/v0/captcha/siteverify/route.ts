import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { consumeVerifiedSession } from "@/lib/captcha-session";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";

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
  const limited = await checkRateLimit(rateLimiters.siteverify, request);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body?.token || !body?.secretKey) {
    return NextResponse.json(
      { success: false, error: "Missing token or secretKey" },
      { status: 400 },
    );
  }

  const { token, secretKey } = body as { token: string; secretKey: string };

  // 1. Consume the verified session from Redis (one-time use)
  const session = await consumeVerifiedSession(token);

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

  return NextResponse.json({ success: true });
}
