import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PuzzleAnalyticsSection } from "@/components/puzzle-analytics-section";
import { requireSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { audio, puzzle, site } from "@/lib/db/app-schema";
import {
  listQuizLinksWithStats,
  listRecentQuizAttempts,
} from "@/lib/quiz-stats";
import { PuzzleDetail } from "./puzzle-detail";
import { QuizLinksCard } from "./quiz-links-card";

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

  const [imageSets, audioClips, quizLinks, quizAttempts] = await Promise.all([
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
    listQuizLinksWithStats(id, session.user.id),
    listRecentQuizAttempts(id, session.user.id),
  ]);

  const now = new Date();
  const quizLinkViews = quizLinks.map((link) => ({
    id: link.id,
    url: config.getSiteUrl(`/q/${link.slug}`),
    expiresAt: link.expiresAt,
    expired: link.expiresAt !== null && link.expiresAt < now,
    challengeCount: link.challengeCount,
    attempts: link.attempts,
    passes: link.passes,
    passRate: link.passRate,
    recentAttempts: quizAttempts.get(link.id) ?? [],
  }));

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
      analyticsSlot={<PuzzleAnalyticsSection puzzleId={puzzleData.puzzle.id} />}
      quizLinksSlot={
        <QuizLinksCard puzzleId={puzzleData.puzzle.id} links={quizLinkViews} />
      }
    />
  );
}
