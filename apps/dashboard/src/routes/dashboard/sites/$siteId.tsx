import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, type Site, unwrap } from "@/lib/api-client";
import { copyToClipboard } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/sites/$siteId")({
  component: SiteDetail,
});

function SiteDetail() {
  const { siteId } = Route.useParams();
  const { t } = useLingui();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const site = useQuery({
    queryKey: ["sites", siteId],
    queryFn: () =>
      unwrap<{ site: Site }>(
        api.api.v1.sites[":id"].$get({ param: { id: siteId } }),
      ),
  });

  const regen = useMutation({
    mutationFn: () =>
      unwrap<{ site: Site; message: string }>(
        api.api.v1.sites[":id"]["regenerate-keys"].$post({
          param: { id: siteId },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites", siteId] });
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const del = useMutation({
    mutationFn: () =>
      unwrap<{ message: string }>(
        api.api.v1.sites[":id"].$delete({ param: { id: siteId } }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      navigate({ to: "/dashboard/sites" });
    },
  });

  if (site.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>Loading…</Trans>
      </p>
    );
  }
  if (site.error) {
    return (
      <p className="text-sm text-destructive">
        {(site.error as Error).message}
      </p>
    );
  }
  if (!site.data) return null;

  const s = site.data.site;
  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to="/dashboard/sites">
          <ArrowLeft />
          <Trans>Back to sites</Trans>
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">{s.name}</h1>
        {s.domain && (
          <p className="text-sm text-muted-foreground">{s.domain}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>API keys</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              The site key is public; the secret key never leaves your server.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <KeyRow label="Site key" value={s.siteKey} />
          <KeyRow label="Secret key" value={s.secretKey} secret />
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
            >
              <RefreshCw />
              {regen.isPending ? (
                <Trans>Regenerating…</Trans>
              ) : (
                <Trans>Regenerate keys</Trans>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trans>Delete site</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t`Delete site`}
        description={t`This permanently removes the site, its keys, and all its puzzles.`}
        confirmText={s.name}
        onConfirm={async () => {
          await del.mutateAsync();
        }}
      />
    </section>
  );
}

function KeyRow({
  label,
  value,
  secret,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
        <code className="flex-1 truncate">
          {secret ? value.replace(/.(?=.{4})/g, "•") : value}
        </code>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => copyToClipboard(value)}
        >
          <Copy className="size-3" />
        </Button>
      </div>
    </div>
  );
}
