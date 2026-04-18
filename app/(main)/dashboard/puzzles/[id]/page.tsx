import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { audio, puzzle, site } from "@/lib/db/app-schema";
import { PuzzleDetail } from "./puzzle-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireSession(), params]);

  const [puzzleData] = await db
    .select()
    .from(puzzle)
    .innerJoin(
      site,
      and(eq(site.id, puzzle.siteId), eq(site.userId, session.user.id)),
    )
    .where(eq(puzzle.id, id));

  if (!puzzleData) notFound();

  const [imageSets, audioClips] = await Promise.all([
    db.query.imageSet.findMany({
      where: (is, { eq: e }) => e(is.userId, session.user.id),
      with: { images: true },
      orderBy: (is, { desc }) => desc(is.createdAt),
    }),
    db
      .select({ id: audio.id, name: audio.name, url: audio.url })
      .from(audio)
      .where(eq(audio.userId, session.user.id))
      .orderBy(audio.createdAt),
  ]);

  return (
    <PuzzleDetail
      puzzle={{
        id: puzzleData.puzzle.id,
        prompt: puzzleData.puzzle.prompt,
        difficulty: puzzleData.puzzle.difficulty,
        correctImageIds: puzzleData.puzzle.correctImageIds as string[],
        incorrectImageIds: puzzleData.puzzle.incorrectImageIds as
          | string[]
          | null,
        correctCount: puzzleData.puzzle.correctCount,
        correctCountMax: puzzleData.puzzle.correctCountMax,
        imageSetId: puzzleData.puzzle.imageSetId,
        audioId: puzzleData.puzzle.audioId,
        audioAnswer: puzzleData.puzzle.audioAnswer,
        captchaMode: puzzleData.puzzle.captchaMode as
          | "image"
          | "audio"
          | "combined",
      }}
      siteName={puzzleData.site.name}
      imageSets={imageSets.map((is) => ({
        id: is.id,
        name: is.name,
        images: is.images.map((img) => ({
          id: img.id,
          url: img.url,
          name: img.name,
        })),
      }))}
      audioClips={audioClips}
    />
  );
}
