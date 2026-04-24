import { getTranslations } from "next-intl/server";
import { AnalyticsChart } from "@/components/analytics-chart";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailySeries, getPuzzleStats } from "@/lib/analytics";
import { formatCompactNumber, formatPercent } from "@/lib/utils";

export async function PuzzleAnalyticsSection({
  puzzleId,
}: {
  puzzleId: string;
}) {
  const t = await getTranslations("analytics");
  const [stats, series] = await Promise.all([
    getPuzzleStats(puzzleId),
    getDailySeries({ puzzleId }),
  ]);

  return (
    <div className="@container flex flex-col gap-6">
      <div className="grid gap-3 grid-cols-1 @sm:grid-cols-3">
        <StatCard
          label={t("solves")}
          value={formatCompactNumber(stats.solves)}
        />
        <StatCard label={t("fails")} value={formatCompactNumber(stats.fails)} />
        <StatCard label={t("passRate")} value={formatPercent(stats.passRate)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("attemptsOverTime")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsChart data={series} metric="passes" label={t("passes")} />
        </CardContent>
      </Card>
    </div>
  );
}
