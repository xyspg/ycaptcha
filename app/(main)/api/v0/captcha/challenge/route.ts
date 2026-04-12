import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createChallengeSession } from "@/lib/captcha-session";
import { db } from "@/lib/db";
import { image, puzzle, site } from "@/lib/db/app-schema";
import { env } from "@/lib/env";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";
import { shuffle } from "@/lib/utils";

export async function POST(request: Request) {
  const limited = await checkRateLimit(rateLimiters.challenge, request);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body?.siteKey) {
    return NextResponse.json({ error: "Missing siteKey" }, { status: 400 });
  }

  const [siteData] = await db
    .select()
    .from(site)
    .where(eq(site.siteKey, body.siteKey));

  if (!siteData) {
    return NextResponse.json({ error: "Invalid siteKey" }, { status: 404 });
  }

  if (siteData.domain && !body.origin) {
    return NextResponse.json({ error: "Missing origin" }, { status: 400 });
  }
  if (siteData.domain && body.origin) {
    try {
      const parentHost = new URL(body.origin).hostname;
      const appHost = new URL(env.NEXT_PUBLIC_SITE_URL).hostname;
      const isLocalhost =
        parentHost === "localhost" || parentHost === "127.0.0.1";
      if (
        !isLocalhost &&
        parentHost !== appHost &&
        parentHost !== siteData.domain &&
        !parentHost.endsWith(`.${siteData.domain}`)
      ) {
        return NextResponse.json(
          { error: "Domain not allowed for this siteKey" },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 400 });
    }
  }

  const [puzzleData] = await db
    .select()
    .from(puzzle)
    .where(and(eq(puzzle.siteId, siteData.id), eq(puzzle.enabled, true)))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (!puzzleData) {
    return NextResponse.json(
      { error: "No puzzles configured for this site" },
      { status: 404 },
    );
  }

  const allCorrectIds = puzzleData.correctImageIds as string[];
  const min = puzzleData.correctCount;
  const max = puzzleData.correctCountMax ?? min;
  const correctCount = min + Math.floor(Math.random() * (max - min + 1));

  const selectedCorrectIds = shuffle(allCorrectIds).slice(0, correctCount);

  const correctImages =
    selectedCorrectIds.length > 0
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

  const neededIncorrect = CAPTCHA_GRID_SIZE - correctImages.length;
  let incorrectImages: { id: string; url: string }[] = [];

  if (puzzleData.incorrectImageIds) {
    const incorrectIds = puzzleData.incorrectImageIds as string[];
    incorrectImages = await db
      .select({ id: image.id, url: image.url })
      .from(image)
      .where(
        and(
          eq(image.imageSetId, puzzleData.imageSetId),
          inArray(image.id, incorrectIds),
          ...(selectedCorrectIds.length > 0
            ? [notInArray(image.id, selectedCorrectIds)]
            : []),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(neededIncorrect);
  } else {
    // exclude ALL correct images, not just the ones selected for this challenge
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

  const allImages = shuffle([...correctImages, ...incorrectImages]);

  if (allImages.length < CAPTCHA_GRID_SIZE) {
    return NextResponse.json(
      { error: "Not enough images configured for this puzzle" },
      { status: 500 },
    );
  }

  const token = await createChallengeSession({
    puzzleId: puzzleData.id,
    siteId: siteData.id,
    imageUrls: allImages.map((img) => img.url),
    imageIds: allImages.map((img) => img.id),
    correctImageIds: correctImages.map((img) => img.id),
    correctCount: correctImages.length,
    difficulty: puzzleData.difficulty,
  });

  // proxy URLs only — no image IDs exposed to client
  return NextResponse.json({
    sessionToken: token,
    prompt: puzzleData.prompt,
    images: allImages.map((_, i) => ({
      url: `/api/v0/captcha/image/${token}/${i}`,
    })),
  });
}
