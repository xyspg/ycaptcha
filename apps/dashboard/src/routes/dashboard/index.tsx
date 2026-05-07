import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api, unwrap } from "@/lib/api-client";

type DashboardStatsResponse = {
  stats: { verifies: number; passRate: number | null; activePuzzles: number };
};

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const stats = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () =>
      unwrap<DashboardStatsResponse>(api.api.analytics.dashboard.$get()),
  });

  return (
    <section>
      <h1>
        <Trans>Dashboard</Trans>
      </h1>
      {stats.isLoading && (
        <p>
          <Trans>Loading…</Trans>
        </p>
      )}
      {stats.error && (
        <p style={{ color: "crimson" }}>{(stats.error as Error).message}</p>
      )}
      {stats.data && (
        <dl style={{ display: "grid", gap: 8 }}>
          <div>
            <dt>
              <Trans>Verifies</Trans>
            </dt>
            <dd>{stats.data.stats.verifies}</dd>
          </div>
          <div>
            <dt>
              <Trans>Pass rate</Trans>
            </dt>
            <dd>
              {stats.data.stats.passRate === null
                ? "—"
                : `${(stats.data.stats.passRate * 100).toFixed(1)}%`}
            </dd>
          </div>
          <div>
            <dt>
              <Trans>Active puzzles</Trans>
            </dt>
            <dd>{stats.data.stats.activePuzzles}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
