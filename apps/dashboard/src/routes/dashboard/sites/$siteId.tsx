import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api, unwrap } from "@/lib/api-client";

type Site = {
  id: string;
  name: string;
  domain: string;
  siteKey: string;
  secretKey: string;
  createdAt: string;
};

export const Route = createFileRoute("/dashboard/sites/$siteId")({
  component: SiteDetail,
});

function SiteDetail() {
  const { siteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const site = useQuery({
    queryKey: ["sites", siteId],
    queryFn: () =>
      unwrap<{ site: Site }>(
        api.api.sites[":id"].$get({ param: { id: siteId } }),
      ),
  });

  const regen = useMutation({
    mutationFn: () =>
      unwrap<{ site: Site; message: string }>(
        api.api.sites[":id"]["regenerate-keys"].$post({
          param: { id: siteId },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sites", siteId] }),
  });

  const del = useMutation({
    mutationFn: () =>
      unwrap<{ message: string }>(
        api.api.sites[":id"].$delete({ param: { id: siteId } }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      navigate({ to: "/dashboard/sites" });
    },
  });

  if (site.isLoading) {
    return (
      <p>
        <Trans>Loading…</Trans>
      </p>
    );
  }
  if (site.error) {
    return <p style={{ color: "crimson" }}>{(site.error as Error).message}</p>;
  }
  if (!site.data) return null;

  const s = site.data.site;
  return (
    <section>
      <p>
        <Link to="/dashboard/sites">
          ← <Trans>Back to sites</Trans>
        </Link>
      </p>
      <h1>{s.name}</h1>
      <p style={{ fontSize: 14, opacity: 0.8 }}>{s.domain}</p>

      <h2>
        <Trans>Keys</Trans>
      </h2>
      <dl>
        <dt>
          <Trans>Site key</Trans>
        </dt>
        <dd>
          <code>{s.siteKey}</code>
        </dd>
        <dt>
          <Trans>Secret key</Trans>
        </dt>
        <dd>
          <code>{s.secretKey}</code>
        </dd>
      </dl>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          type="button"
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
        >
          <Trans>Regenerate keys</Trans>
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this site?")) del.mutate();
          }}
          disabled={del.isPending}
          style={{ color: "crimson" }}
        >
          <Trans>Delete</Trans>
        </button>
      </div>
    </section>
  );
}
