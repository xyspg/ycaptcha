import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AnalyticsChart } from "@/components/analytics-chart";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDailySeries,
  getDashboardStats,
  listPuzzleStatsForUser,
} from "@/lib/analytics";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { formatCompactNumber, formatPercent } from "@/lib/utils";

export default async function Page() {
  const session = await requireSession();
  const t = await getTranslations("analytics");

  const [stats, series, perPuzzleStats, userSites] = await Promise.all([
    getDashboardStats(session.user.id),
    getDailySeries({ userId: session.user.id }),
    listPuzzleStatsForUser(session.user.id),
    db.select().from(site).where(eq(site.userId, session.user.id)),
  ]);

  const activePuzzleIds = [...perPuzzleStats.keys()];
  const activePuzzles =
    activePuzzleIds.length > 0
      ? await db
          .select({
            id: puzzle.id,
            prompt: puzzle.prompt,
            siteName: site.name,
          })
          .from(puzzle)
          .innerJoin(site, eq(site.id, puzzle.siteId))
          .where(inArray(puzzle.id, activePuzzleIds))
      : [];

  const topPuzzles = activePuzzles
    .map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const s = perPuzzleStats.get(p.id)!;
      return {
        ...p,
        solves: s.solves,
        fails: s.fails,
        passRate: s.passRate,
        volume: s.solves + s.fails,
      };
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("window")}</p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label={t("verifies")}
          value={formatCompactNumber(stats.verifies)}
          hint={t("verifiesHint")}
        />
        <StatCard
          label={t("passRate")}
          value={formatPercent(stats.passRate)}
          hint={t("passRateHint")}
        />
        <StatCard
          label={t("activePuzzles")}
          value={formatCompactNumber(stats.activePuzzles)}
          hint={t("activePuzzlesHint", { count: userSites.length })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("verifiesOverTime")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsChart
            data={series}
            metric="verifies"
            label={t("verifies")}
          />
        </CardContent>
      </Card>

      {topPuzzles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("topPuzzles")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {topPuzzles.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/puzzles/${p.id}`}
                className="flex items-center justify-between border-t py-3 first:border-t-0 first:pt-0 hover:text-foreground/80"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="truncate text-sm font-medium">
                    {p.prompt}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.siteName}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums shrink-0">
                  <span>{t("solvesShort", { count: p.solves })}</span>
                  <span>{t("failsShort", { count: p.fails })}</span>
                  <span className="font-medium text-foreground">
                    {formatPercent(p.passRate)}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
