import { NextResponse } from "next/server";
import { eq, and, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { site, puzzle, image, captchaSession } from "@/lib/db/app-schema";
import { CAPTCHA_GRID_SIZE, CAPTCHA_SESSION_TTL_MS } from "@/lib/types";
import { shuffle } from "@/lib/utils";

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
 * 3. Randomly pick `correctCount` from the puzzle's correct pool,
 *    then fill remaining slots from incorrect/random images
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

  // 1b. Verify parent origin matches the site's domain.
  if (siteData.domain && body.origin) {
    try {
      const parentHost = new URL(body.origin).hostname;
      if (
        parentHost !== siteData.domain &&
        !parentHost.endsWith(`.${siteData.domain}`)
      ) {
        return NextResponse.json(
          { error: "Domain not allowed for this siteKey" },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 400 },
      );
    }
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

  const allCorrectIds = puzzleData.correctImageIds as string[];
  const correctCount = puzzleData.correctCount;

  // 3. Randomly pick `correctCount` correct images from the full pool
  const selectedCorrectIds = shuffle(allCorrectIds).slice(0, correctCount);

  const correctImages = selectedCorrectIds.length > 0
    ? await db
        .select({ id: image.id, url: image.url })
        .from(image)
        .where(
          and(
            eq(image.imageSetId, puzzleData.imageSetId),
            inArray(image.id, selectedCorrectIds),
          ),
        )
    : [];

  // 4. Get incorrect images to fill remaining slots
  const neededIncorrect = CAPTCHA_GRID_SIZE - correctImages.length;
  let incorrectImages: { id: string; url: string }[] = [];

  if (puzzleData.incorrectImageIds) {
    // Use hand-picked incorrect images (random subset)
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
    // Random from pool, excluding ALL correct images (not just selected ones)
    incorrectImages = await db
      .select({ id: image.id, url: image.url })
      .from(image)
      .where(
        and(
          eq(image.imageSetId, puzzleData.imageSetId),
          ...(allCorrectIds.length > 0
            ? [notInArray(image.id, allCorrectIds)]
            : []),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(neededIncorrect);
  }

  // 5. Combine and shuffle
  const allImages = shuffle([...correctImages, ...incorrectImages]);

  // 6. Create captcha session
  const expiresAt = new Date(Date.now() + CAPTCHA_SESSION_TTL_MS);
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
