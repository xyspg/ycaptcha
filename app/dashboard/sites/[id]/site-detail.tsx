"use client";

import { useActionState, useState } from "react";
import { type InferSelectModel } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Plus, Trash2 } from "lucide-react";
import { site, puzzle } from "@/lib/db/app-schema";
import {
  updateSite,
  regenerateKeys,
  deleteSite,
  deletePuzzleFromSite,
  type ActionState,
} from "../actions";
import { togglePuzzleEnabled } from "../../puzzles/[id]/actions";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CopyButton } from "@/components/copy-button";
import { env } from "@/lib/env";

function ApiKeysSection({ s }: { s: InferSelectModel<typeof site> }) {
  const [showSecret, setShowSecret] = useState(false);
  const [regenState, regenAction, isRegenerating] = useActionState(
    regenerateKeys,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Use these keys to integrate yCAPTCHA with your site.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Site Key (public)
          </Label>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm">
            <span className="flex-1 truncate">{s.siteKey}</span>
            <CopyButton value={s.siteKey} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Secret Key (private)
          </Label>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm">
            <span className="flex-1 truncate">
              {showSecret ? s.secretKey : "sk_" + "\u2022".repeat(32)}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? (
                <EyeOff className="size-3" />
              ) : (
                <Eye className="size-3" />
              )}
            </Button>
            <CopyButton value={s.secretKey} />
          </div>
        </div>
        <form action={regenAction}>
          <input type="hidden" name="siteId" value={s.id} />
          <Button variant="outline" size="sm" disabled={isRegenerating}>
            <RefreshCw className="size-3" />
            {isRegenerating ? "Regenerating..." : "Regenerate Keys"}
          </Button>
        </form>
        {regenState?.success && (
          <p className="text-xs text-muted-foreground">{regenState.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsSection({ s }: { s: InferSelectModel<typeof site> }) {
  const [state, formAction, isPending] = useActionState(updateSite, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="siteId" value={s.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={s.name} required />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              name="domain"
              defaultValue={s.domain ?? ""}
              placeholder="example.com"
              required
            />
            {state?.errors?.domain && (
              <p className="text-xs text-destructive">
                {state.errors.domain[0]}
              </p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {state?.success && (
            <p className="text-xs text-muted-foreground">{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function PuzzleRow({
  p,
  siteId,
}: {
  p: InferSelectModel<typeof puzzle>;
  siteId: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [enabled, setEnabled] = useState(p.enabled);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50 ${!enabled ? "opacity-50" : ""}`}
          >
            <Link
              href={`/dashboard/puzzles/${p.id}`}
              className="flex min-w-0 flex-1 items-center justify-between gap-2"
            >
              <span className="text-sm">{p.prompt}</span>
              <span className="text-xs text-muted-foreground">
                difficulty: {p.difficulty}
              </span>
            </Link>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
                togglePuzzleEnabled(p.id, checked);
              }}
              className="ml-3 shrink-0"
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete Puzzle
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Puzzle"
        description="This will permanently delete this puzzle. Existing captcha sessions using it will stop working."
        onConfirm={() => deletePuzzleFromSite(p.id, siteId)}
      />
    </>
  );
}

function PuzzlesSection({
  s,
  puzzles,
}: {
  s: InferSelectModel<typeof site>;
  puzzles: InferSelectModel<typeof puzzle>[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Puzzles</CardTitle>
        <CardDescription>
          {puzzles.length === 0
            ? "No puzzles yet. Create one to start using yCAPTCHA on this site."
            : `${puzzles.length} puzzle${puzzles.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {puzzles.map((p) => (
          <PuzzleRow key={p.id} p={p} siteId={s.id} />
        ))}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/puzzles/new?siteId=${s.id}`}>
            <Plus className="size-3" /> Create Puzzle
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// SRI hash for public/captcha.js — regenerate with:
//   cat public/captcha.js | openssl dgst -sha384 -binary | openssl base64 -A
const CAPTCHA_JS_INTEGRITY =
  "sha384-a73YP8tlzlqGToYP+QiCYMQOrfR13zM7EUpUI60nEywSo7A183MuJ5nGs7SnoPHx";

function EmbedSection({ s }: { s: InferSelectModel<typeof site> }) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const widgetUrl = `${siteUrl}/widget/${s.siteKey}`;
  const snippet = `<div class="y-captcha" data-sitekey="${s.siteKey}"></div>
<script src="${siteUrl}/captcha.js" integrity="${CAPTCHA_JS_INTEGRITY}" crossorigin="anonymous" async defer></script>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Widget</CardTitle>
        <CardDescription>
          Copy the code below and paste it into your website.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
            {snippet}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton value={snippet} />
          </div>
        </div>
        <Separator />
        <div>
          <p className="mb-3 text-sm font-medium">Preview</p>
          <iframe
            src={widgetUrl}
            className="h-[600px] w-full max-w-[400px] rounded-md border"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function SiteDetail({
  site: s,
  puzzles,
}: {
  site: InferSelectModel<typeof site>;
  puzzles: InferSelectModel<typeof puzzle>[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/sites">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{s.name}</h1>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ApiKeysSection s={s} />
          <SettingsSection s={s} />
          <DangerZone s={s} />
        </div>
        <div className="flex flex-col gap-6">
          <PuzzlesSection s={s} puzzles={puzzles} />
          {puzzles.length > 0 && <EmbedSection s={s} />}
        </div>
      </div>
    </div>
  );
}

function DangerZone({ s }: { s: InferSelectModel<typeof site> }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.set("siteId", s.id);
    await deleteSite(null, fd);
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deleting this site will permanently remove all its puzzles and
            active CAPTCHA widgets will stop working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3" /> Delete Site
          </Button>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Site"
        description="This will permanently delete this site and all its puzzles. Active CAPTCHA widgets will stop working."
        confirmText={s.name}
        onConfirm={handleDelete}
      />
    </>
  );
}
