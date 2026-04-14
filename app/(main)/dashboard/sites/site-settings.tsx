"use client";

import type { InferSelectModel } from "drizzle-orm";
import { Globe, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
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
import type { site } from "@/lib/db/app-schema";
import { copyToClipboard } from "@/lib/utils";
import { type ActionState, createSite, deleteSite } from "./actions";

function CreateSiteDialog() {
  const t = useTranslations("sites");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createSite(prev, formData);
      if (result?.success) setOpen(false);
      return result;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {t("addSite")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createSheet.title")}</DialogTitle>
          <DialogDescription>{t("createSheet.description")}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="resource-name">{tc("name")}</Label>
            <Input
              id="resource-name"
              name="resource-name"
              placeholder={t("createSheet.namePlaceholder")}
              defaultValue={state?.values?.name}
              required
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain">{tc("domain")}</Label>
            <Input
              id="domain"
              name="domain"
              placeholder={t("createSheet.domainPlaceholder")}
              defaultValue={state?.values?.domain}
              required
            />
            {state?.errors?.domain && (
              <p className="text-xs text-destructive">
                {state.errors.domain[0]}
              </p>
            )}
          </div>
          <Button variant="outline" type="submit" disabled={isPending}>
            {isPending ? tc("creating") : t("createSheet.createSite")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SiteCard({ s }: { s: InferSelectModel<typeof site> }) {
  const t = useTranslations("sites");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.set("siteId", s.id);
    await deleteSite(null, fd);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card className="relative">
            <Link
              href={`/dashboard/sites/${s.id}`}
              className="absolute inset-0 z-0"
            />
            <CardHeader>
              <CardTitle className="text-base">
                <Link
                  href={`/dashboard/sites/${s.id}`}
                  className="relative z-10 hover:underline"
                >
                  {s.name}
                </Link>
              </CardTitle>
              {s.domain && (
                <CardDescription>
                  <a
                    href={`https://${s.domain}`}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="relative z-10 hover:underline"
                  >
                    {s.domain}
                  </a>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span
                  className="truncate cursor-copy hover:underline relative z-10"
                  onClick={() => {
                    copyToClipboard(s.siteKey);
                  }}
                >
                  {s.siteKey}
                </span>
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            {t("deleteSite")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteSite")}
        description={t("deleteSiteDescription")}
        confirmText={s.name}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function SiteSettings({
  sites,
}: {
  sites: InferSelectModel<typeof site>[];
}) {
  const t = useTranslations("sites");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <CreateSiteDialog />
      </div>

      {sites.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Globe className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">{t("noSitesYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noSitesDescription")}
          </p>
          <div className="mt-6">
            <CreateSiteDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => (
            <SiteCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
