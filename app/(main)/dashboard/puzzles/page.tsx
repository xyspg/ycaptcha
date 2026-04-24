import { eq } from "drizzle-orm";
import { KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPuzzleStatsForUser } from "@/lib/analytics";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site } from "@/lib/db/app-schema";
import { PuzzleCard } from "./puzzle-card";

export default async function Page() {
  const session = await requireSession();
  const t = await getTranslations("puzzles");

  const userSites = await db
    .select()
    .from(site)
    .where(eq(site.userId, session.user.id));

  const siteIds = userSites.map((s) => s.id);

  const puzzlesPromise =
    siteIds.length > 0
      ? db.query.puzzle.findMany({
          where: (p, { inArray }) => inArray(p.siteId, siteIds),
          with: { site: true, imageSet: true },
          orderBy: (p, { desc }) => desc(p.createdAt),
        })
      : null;

  const [puzzles, puzzleStats] = await Promise.all([
    puzzlesPromise ?? [],
    listPuzzleStatsForUser(session.user.id),
  ]);

  const hasPrereqs = userSites.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {hasPrereqs && (
          <Button asChild>
            <Link href="/dashboard/puzzles/new">
              <Plus className="size-4" /> {t("createPuzzle")}
            </Link>
          </Button>
        )}
      </div>

      {puzzles.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <KeyRound className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">{t("noPuzzlesYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {!hasPrereqs ? (
              <>
                <Link
                  href="/dashboard/sites"
                  className="underline hover:text-foreground"
                >
                  {t("createSiteFirst")}
                </Link>
                {t("createSiteFirstSuffix")}
              </>
            ) : (
              t("noPuzzlesDescription")
            )}
          </p>
          {hasPrereqs && (
            <div className="mt-6">
              <Button asChild>
                <Link href="/dashboard/puzzles/new">
                  <Plus className="size-4" /> {t("createPuzzle")}
                </Link>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {puzzles.map((p) => {
            const s = puzzleStats.get(p.id);
            return (
              <PuzzleCard
                key={p.id}
                id={p.id}
                prompt={p.prompt}
                siteName={p.site.name}
                difficulty={p.difficulty}
                imageSetName={p.imageSet?.name ?? null}
                correctCount={p.correctCount}
                enabled={p.enabled}
                solves={s?.solves ?? 0}
                fails={s?.fails ?? 0}
                passRate={s?.passRate ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
