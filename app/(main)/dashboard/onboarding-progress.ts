import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { audio, image, imageSet, puzzle, site } from "@/lib/db/app-schema";

export const ONBOARDING_DISMISSED_COOKIE = "onboarding-dismissed";

export type OnboardingProgress = {
  hasSite: boolean;
  hasContent: boolean;
  hasPuzzle: boolean;
  firstSiteId: string | null;
};

export async function getOnboardingProgress(
  userId: string,
): Promise<OnboardingProgress> {
  const [firstSiteRow, firstImageRow, firstAudioRow, firstPuzzleRow] =
    await Promise.all([
      db
        .select({ id: site.id })
        .from(site)
        .where(eq(site.userId, userId))
        .orderBy(desc(site.createdAt))
        .limit(1),
      db
        .select({ id: image.id })
        .from(image)
        .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
        .where(eq(imageSet.userId, userId))
        .limit(1),
      db
        .select({ id: audio.id })
        .from(audio)
        .where(eq(audio.userId, userId))
        .limit(1),
      db
        .select({ id: puzzle.id })
        .from(puzzle)
        .innerJoin(site, eq(puzzle.siteId, site.id))
        .where(eq(site.userId, userId))
        .limit(1),
    ]);

  return {
    hasSite: firstSiteRow.length > 0,
    hasContent: firstImageRow.length > 0 || firstAudioRow.length > 0,
    hasPuzzle: firstPuzzleRow.length > 0,
    firstSiteId: firstSiteRow[0]?.id ?? null,
  };
}
