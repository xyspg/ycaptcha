import { NextResponse } from "next/server";
import { eq, and, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { site, puzzle, image, captchaSession } from "@/lib/db/app-schema";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

/**
 * POST /api/v0/captcha/challenge
 *
 * Called by the widget iframe to get a new challenge.
 * Body: { siteKey: string }
 * Returns: { sessionToken, prompt, images: [{ id, url }] }
 *
 * Flow:
 * 1. Look up site by siteKey
 * 2. Pick a random puzzle for that site
 * 3. Assemble 9 images: correctImageIds + fill from pool (or incorrectImageIds)
 * 4. Create a captchaSession with 5-min expiry
 * 5. Return shuffled images + session token
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.siteKey) {
    return NextResponse.json({ error: "Missing siteKey" }, { status: 400 });
  }

  // 1. Find site
  const [siteData] = await db
    .select()
    .from(site)
    .where(eq(site.siteKey, body.siteKey));

  if (!siteData) {
    return NextResponse.json({ error: "Invalid siteKey" }, { status: 404 });
  }

  // 2. Pick a random puzzle for this site
  const [puzzleData] = await db
    .select()
    .from(puzzle)
    .where(eq(puzzle.siteId, siteData.id))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (!puzzleData) {
    return NextResponse.json(
      { error: "No puzzles configured for this site" },
      { status: 404 },
    );
  }

  const correctIds = puzzleData.correctImageIds as string[];

  // 3. Get correct images
  const correctImages = correctIds.length > 0
    ? await db
        .select({ id: image.id, url: image.url })
        .from(image)
        .where(
          and(
            eq(image.imageSetId, puzzleData.imageSetId),
            inArray(image.id, correctIds),
          ),
        )
    : [];

  // 4. Get incorrect images (either specified or random from pool)
  const neededIncorrect = CAPTCHA_GRID_SIZE - correctImages.length;
  let incorrectImages: { id: string; url: string }[] = [];

  if (puzzleData.incorrectImageIds) {
    // Use hand-picked incorrect images
    const incorrectIds = puzzleData.incorrectImageIds as string[];
    incorrectImages = await db
      .select({ id: image.id, url: image.url })
      .from(image)
      .where(
        and(
          eq(image.imageSetId, puzzleData.imageSetId),
          inArray(image.id, incorrectIds),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(neededIncorrect);
  } else {
    // Random from pool, excluding correct images
    incorrectImages = await db
      .select({ id: image.id, url: image.url })
      .from(image)
      .where(
        and(
          eq(image.imageSetId, puzzleData.imageSetId),
          ...(correctIds.length > 0
            ? [notInArray(image.id, correctIds)]
            : []),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(neededIncorrect);
  }

  // 5. Combine and shuffle
  const allImages = [...correctImages, ...incorrectImages];
  for (let i = allImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
  }

  // 6. Create captcha session
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const [session] = await db
    .insert(captchaSession)
    .values({
      puzzleId: puzzleData.id,
      expiresAt,
    })
    .returning({ token: captchaSession.token });

  return NextResponse.json({
    sessionToken: session.token,
    prompt: puzzleData.prompt,
    images: allImages,
  });
}
