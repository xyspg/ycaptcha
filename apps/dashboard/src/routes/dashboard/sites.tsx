import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api, unwrap } from "@/lib/api-client";

type Site = {
  id: string;
  name: string;
  domain: string;
  siteKey: string;
  createdAt: string;
};

type SitesResponse = { sites: Site[] };
type SiteResponse = { site: Site; message: string };

export const Route = createFileRoute("/dashboard/sites")({
  component: SitesPage,
});

function SitesPage() {
  const qc = useQueryClient();
  const sites = useQuery({
    queryKey: ["sites"],
    queryFn: () => unwrap<SitesResponse>(api.api.sites.$get()),
  });

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createSite = useMutation({
    mutationFn: (input: { name: string; domain: string }) =>
      unwrap<SiteResponse>(
        api.api.sites.$post(
          { json: input },
          { init: { credentials: "include" } },
        ),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      setName("");
      setDomain("");
      setFormError(null);
    },
    onError: (err: unknown) => {
      const e = err as {
        body?: { error?: string; details?: Record<string, string[]> };
      };
      const detail = e.body?.details
        ? Object.values(e.body.details).flat().join(", ")
        : null;
      setFormError(detail ?? e.body?.error ?? "Failed to create site");
    },
  });

  return (
    <section>
      <h1>
        <Trans>Sites</Trans>
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createSite.mutate({ name, domain });
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          required
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <button type="submit" disabled={createSite.isPending}>
          {createSite.isPending ? (
            <Trans>Creating…</Trans>
          ) : (
            <Trans>Create site</Trans>
          )}
        </button>
      </form>
      {formError && <p style={{ color: "crimson" }}>{formError}</p>}

      {sites.isLoading && (
        <p>
          <Trans>Loading…</Trans>
        </p>
      )}
      {sites.error && (
        <p style={{ color: "crimson" }}>{(sites.error as Error).message}</p>
      )}
      {sites.data && sites.data.sites.length === 0 && (
        <p>
          <Trans>No sites yet.</Trans>
        </p>
      )}
      {sites.data && sites.data.sites.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {sites.data.sites.map((s) => (
            <li
              key={s.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <strong>
                <Link to="/dashboard/sites/$siteId" params={{ siteId: s.id }}>
                  {s.name}
                </Link>
              </strong>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {s.domain} · <code>{s.siteKey}</code>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
