import { NextResponse } from "next/server";
import { eq, and, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { site, puzzle, image } from "@/lib/db/app-schema";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import { createChallengeSession } from "@/lib/captcha-session";
import { rateLimiters, checkRateLimit } from "@/lib/rate-limit";

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
 * 4. Create a Redis session with 5-min TTL
 * 5. Return shuffled images + session token
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(rateLimiters.challenge, request);
  if (limited) return limited;

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

  // 6. Create Redis session with all verification data
  const token = await createChallengeSession({
    puzzleId: puzzleData.id,
    siteId: siteData.id,
    imageUrls: allImages.map((img) => img.url),
    imageIds: allImages.map((img) => img.id),
    correctImageIds: allCorrectIds,
    correctCount,
    difficulty: puzzleData.difficulty,
  });

  // 7. Return proxy URLs instead of real R2 URLs
  return NextResponse.json({
    sessionToken: token,
    prompt: puzzleData.prompt,
    images: allImages.map((img, i) => ({
      id: img.id,
      url: `/api/v0/captcha/image/${token}/${i}`,
    })),
  });
}
