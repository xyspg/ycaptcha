import { getTranslations } from "next-intl/server";
import { AnalyticsChart } from "@/components/analytics-chart";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailySeries, getSiteStats } from "@/lib/analytics";
import { formatCompactNumber, formatPercent } from "@/lib/utils";

interface SiteAnalyticsSectionProps {
  siteId: string;
  userId: string;
}

export async function SiteAnalyticsSection({
  siteId,
  userId,
}: SiteAnalyticsSectionProps) {
  const t = await getTranslations("analytics");
  const [stats, series] = await Promise.all([
    getSiteStats(siteId, userId),
    getDailySeries({ siteId, userId }),
  ]);

  return (
    <div className="@container flex flex-col gap-6">
      <div className="grid gap-3 grid-cols-1 @sm:grid-cols-3">
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
          hint={t("activePuzzlesOnSiteHint")}
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
    </div>
  );
}
