import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttempt, quizLink } from "@/lib/db/app-schema";

export type QuizAttemptInput = {
  quizLinkId: string;
  passed: boolean;
  autoFailed: boolean;
  mode: "image" | "audio";
  selectedCount: number;
  correctSelections: number;
  wrongSelections: number;
};

export type QuizLinkWithStats = {
  id: string;
  slug: string;
  expiresAt: Date | null;
  challengeCount: number;
  createdAt: Date;
  attempts: number;
  passes: number;
  passRate: number | null;
};

export type QuizAttemptRow = {
  id: string;
  quizLinkId: string;
  passed: boolean;
  autoFailed: boolean;
  mode: string;
  selectedCount: number;
  correctSelections: number;
  wrongSelections: number;
  createdAt: Date;
};

export async function recordQuizAttempt(input: QuizAttemptInput) {
  try {
    await db.insert(quizAttempt).values(input);
  } catch (err) {
    // Fire-and-forget: never break the quiz flow because telemetry failed.
    console.error("[quiz-stats] recordQuizAttempt failed", err);
  }
}

export async function incrementQuizChallengeCount(quizLinkId: string) {
  try {
    await db
      .update(quizLink)
      .set({ challengeCount: sql`${quizLink.challengeCount} + 1` })
      .where(eq(quizLink.id, quizLinkId));
  } catch (err) {
    console.error("[quiz-stats] incrementQuizChallengeCount failed", err);
  }
}

export async function listQuizLinksWithStats(
  puzzleId: string,
  userId: string,
): Promise<QuizLinkWithStats[]> {
  const links = await db
    .select()
    .from(quizLink)
    .where(and(eq(quizLink.puzzleId, puzzleId), eq(quizLink.userId, userId)))
    .orderBy(desc(quizLink.createdAt));

  if (links.length === 0) return [];

  const aggregates = await db
    .select({
      quizLinkId: quizAttempt.quizLinkId,
      passed: quizAttempt.passed,
      n: count(),
    })
    .from(quizAttempt)
    .innerJoin(
      quizLink,
      and(
        eq(quizLink.id, quizAttempt.quizLinkId),
        eq(quizLink.puzzleId, puzzleId),
        eq(quizLink.userId, userId),
      ),
    )
    .groupBy(quizAttempt.quizLinkId, quizAttempt.passed);

  const byLink = new Map<string, { attempts: number; passes: number }>();
  for (const row of aggregates) {
    let bucket = byLink.get(row.quizLinkId);
    if (!bucket) {
      bucket = { attempts: 0, passes: 0 };
      byLink.set(row.quizLinkId, bucket);
    }
    const n = Number(row.n);
    bucket.attempts += n;
    if (row.passed) bucket.passes += n;
  }

  return links.map((link) => {
    const agg = byLink.get(link.id) ?? { attempts: 0, passes: 0 };
    return {
      id: link.id,
      slug: link.slug,
      expiresAt: link.expiresAt,
      challengeCount: link.challengeCount,
      createdAt: link.createdAt,
      attempts: agg.attempts,
      passes: agg.passes,
      passRate: agg.attempts === 0 ? null : agg.passes / agg.attempts,
    };
  });
}

const RECENT_ATTEMPTS_LIMIT = 50;

/** Recent attempts across all of a puzzle's links, newest first, capped per link. */
export async function listRecentQuizAttempts(
  puzzleId: string,
  userId: string,
): Promise<Map<string, QuizAttemptRow[]>> {
  const ranked = db.$with("ranked").as(
    db
      .select({
        id: quizAttempt.id,
        quizLinkId: quizAttempt.quizLinkId,
        passed: quizAttempt.passed,
        autoFailed: quizAttempt.autoFailed,
        mode: quizAttempt.mode,
        selectedCount: quizAttempt.selectedCount,
        correctSelections: quizAttempt.correctSelections,
        wrongSelections: quizAttempt.wrongSelections,
        createdAt: quizAttempt.createdAt,
        rank: sql<number>`row_number() over (partition by ${quizAttempt.quizLinkId} order by ${quizAttempt.createdAt} desc)`.as(
          "rank",
        ),
      })
      .from(quizAttempt)
      .innerJoin(
        quizLink,
        and(
          eq(quizLink.id, quizAttempt.quizLinkId),
          eq(quizLink.puzzleId, puzzleId),
          eq(quizLink.userId, userId),
        ),
      ),
  );

  const rows = await db
    .with(ranked)
    .select()
    .from(ranked)
    .where(sql`${ranked.rank} <= ${RECENT_ATTEMPTS_LIMIT}`);

  const byLink = new Map<string, QuizAttemptRow[]>();
  for (const row of rows) {
    let list = byLink.get(row.quizLinkId);
    if (!list) {
      list = [];
      byLink.set(row.quizLinkId, list);
    }
    list.push({
      id: row.id,
      quizLinkId: row.quizLinkId,
      passed: row.passed,
      autoFailed: row.autoFailed,
      mode: row.mode,
      selectedCount: row.selectedCount,
      correctSelections: row.correctSelections,
      wrongSelections: row.wrongSelections,
      createdAt: row.createdAt,
    });
  }
  for (const list of byLink.values()) {
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return byLink;
}
