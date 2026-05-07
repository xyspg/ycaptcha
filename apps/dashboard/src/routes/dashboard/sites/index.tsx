import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  type CreateSiteInput,
  createSiteSchema,
} from "@ycaptcha/shared/schemas";
import { Globe, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Site, unwrap } from "@/lib/api-client";
import { copyToClipboard } from "@/lib/utils";

type SitesResponse = { sites: Site[] };

export const Route = createFileRoute("/dashboard/sites/")({
  component: SitesPage,
});

function SitesPage() {
  const sites = useQuery({
    queryKey: ["sites"],
    queryFn: () => unwrap<SitesResponse>(api.api.sites.$get()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          <Trans>Sites</Trans>
        </h1>
        <CreateSiteDialog />
      </div>

      {sites.isLoading && (
        <p className="text-sm text-muted-foreground">
          <Trans>Loading…</Trans>
        </p>
      )}
      {sites.error && (
        <p className="text-sm text-destructive">
          {(sites.error as Error).message}
        </p>
      )}
      {sites.data?.sites.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <Globe className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">
            <Trans>No sites yet</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans>Create your first site to start verifying users.</Trans>
          </p>
          <div className="mt-6">
            <CreateSiteDialog />
          </div>
        </Card>
      )}
      {sites.data && sites.data.sites.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.data.sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSiteDialog() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateSiteInput>({
    // zod 4.4 vs resolver's bundled 4.3 — minor type-version mismatch; runtime is fine
    resolver: zodResolver(createSiteSchema as never),
    defaultValues: { name: "", domain: "" },
  });

  const createSite = useMutation({
    mutationFn: (input: CreateSiteInput) =>
      unwrap<{ site: Site }>(api.api.sites.$post({ json: input })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      form.reset();
      setOpen(false);
    },
    onError: (err: unknown) => {
      const e = err as { body?: { error?: string } };
      form.setError("root", {
        message: e.body?.error ?? "Failed to create site",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          <Trans>Add site</Trans>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Create a new site</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Each site gets its own keys and embed snippet.</Trans>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => createSite.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="resource-name">
              <Trans>Name</Trans>
            </Label>
            <Input
              id="resource-name"
              placeholder={t`My website`}
              autoComplete="off"
              data-1p-ignore
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain">
              <Trans>Domain</Trans>
            </Label>
            <Input
              id="domain"
              placeholder="example.com"
              {...form.register("domain")}
            />
            {form.formState.errors.domain && (
              <p className="text-xs text-destructive">
                {form.formState.errors.domain.message}
              </p>
            )}
          </div>
          {form.formState.errors.root && (
            <p className="text-xs text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            disabled={createSite.isPending}
          >
            {createSite.isPending ? (
              <Trans>Creating…</Trans>
            ) : (
              <Trans>Create site</Trans>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SiteCard({ site }: { site: Site }) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteSite = useMutation({
    mutationFn: () =>
      unwrap<{ message: string }>(
        api.api.sites[":id"].$delete({ param: { id: site.id } }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            to="/dashboard/sites/$siteId"
            params={{ siteId: site.id }}
            className="block focus:outline-none"
          >
            <Card className="hover:border-foreground/30 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{site.name}</CardTitle>
                {site.domain && (
                  <CardDescription>{site.domain}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <span className="block truncate text-xs text-muted-foreground font-mono">
                  {site.siteKey}
                </span>
              </CardContent>
            </Card>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={(e) => {
              e.preventDefault();
              copyToClipboard(site.siteKey);
            }}
          >
            <Trans>Copy site key</Trans>
          </ContextMenuItem>
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            <Trans>Delete site</Trans>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t`Delete site`}
        description={t`This permanently removes the site and all its puzzles.`}
        confirmText={site.name}
        onConfirm={async () => {
          await deleteSite.mutateAsync();
        }}
      />
    </>
  );
}
