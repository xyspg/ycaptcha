import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  consumeVerifiedSession,
  createVerifiedSessionWithToken,
} from "@/lib/captcha-session";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

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

  const session = await consumeVerifiedSession(token);

  if (!session) {
    return NextResponse.json({ success: false, error: "Invalid token" });
  }

  let owner: { siteId: string } | undefined;
  try {
    [owner] = await db
      .select({ siteId: site.id })
      .from(puzzle)
      .innerJoin(
        site,
        and(eq(site.id, puzzle.siteId), eq(site.secretKey, secretKey)),
      )
      .where(eq(puzzle.id, session.puzzleId));
  } catch {
    // DB failure — restore the token so the caller can retry
    await createVerifiedSessionWithToken(token, session);
    return NextResponse.json(
      { success: false, error: "Internal error, please retry" },
      { status: 500 },
    );
  }

  if (!owner) {
    return NextResponse.json({ success: false, error: "Invalid secretKey" });
  }

  return NextResponse.json({ success: true });
}
