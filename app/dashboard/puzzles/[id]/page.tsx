import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { puzzle, site, image } from "@/lib/db/app-schema";
import { PuzzleDetail } from "./puzzle-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireSession(), params]);

  // Fetch puzzle with site (verify ownership via site.userId)
  const [puzzleData] = await db
    .select()
    .from(puzzle)
    .innerJoin(site, and(eq(site.id, puzzle.siteId), eq(site.userId, session.user.id)))
    .where(eq(puzzle.id, id));

  if (!puzzleData) notFound();

  // Fetch all images in the puzzle's image set
  const images = await db
    .select({ id: image.id, url: image.url, name: image.name })
    .from(image)
    .where(eq(image.imageSetId, puzzleData.puzzle.imageSetId));

  return (
    <PuzzleDetail
      puzzle={{
        id: puzzleData.puzzle.id,
        prompt: puzzleData.puzzle.prompt,
        difficulty: puzzleData.puzzle.difficulty,
        correctImageIds: puzzleData.puzzle.correctImageIds as string[],
        incorrectImageIds: puzzleData.puzzle.incorrectImageIds as string[] | null,
        imageSetId: puzzleData.puzzle.imageSetId,
      }}
      siteName={puzzleData.site.name}
      images={images}
    />
  );
}
