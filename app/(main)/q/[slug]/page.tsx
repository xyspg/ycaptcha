import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { puzzle, quizLink } from "@/lib/db/app-schema";
import { QuizPlayer } from "./quiz-player";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("quiz");
  return { title: `${t("title")} — yCAPTCHA` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, t] = await Promise.all([params, getTranslations("quiz")]);

  const [row] = await db
    .select({ link: quizLink, puzzle })
    .from(quizLink)
    .innerJoin(puzzle, eq(puzzle.id, quizLink.puzzleId))
    .where(eq(quizLink.slug, slug));

  const available =
    row?.puzzle.enabled &&
    (!row.link.expiresAt || row.link.expiresAt > new Date());

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      {available ? (
        <QuizPlayer slug={slug} />
      ) : (
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold">{t("unavailableTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("unavailableDescription")}
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t("poweredBy")}{" "}
        <Link href="/" className="font-medium underline hover:text-foreground">
          yCAPTCHA
        </Link>
      </p>
    </div>
  );
}
