"use client";

import type { InferSelectModel } from "drizzle-orm";
import { ArrowLeft, Eye, EyeOff, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CopyButton } from "@/components/copy-button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { puzzle, site } from "@/lib/db/app-schema";
import { env } from "@/lib/env";
import { togglePuzzleEnabled } from "../../puzzles/[id]/actions";
import {
	deletePuzzleFromSite,
	deleteSite,
	regenerateKeys,
	updateSite,
} from "../actions";

function ApiKeysSection({ s }: { s: InferSelectModel<typeof site> }) {
	const t = useTranslations("sites.detail");
	const tc = useTranslations("common");
	const [showSecret, setShowSecret] = useState(false);
	const [regenState, regenAction, isRegenerating] = useActionState(
		regenerateKeys,
		null,
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("apiKeys")}</CardTitle>
				<CardDescription>{t("apiKeysDescription")}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">
						{t("siteKeyPublic")}
					</Label>
					<div className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm">
						<span className="flex-1 truncate">{s.siteKey}</span>
						<CopyButton value={s.siteKey} />
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">
						{t("secretKeyPrivate")}
					</Label>
					<div className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm">
						<span className="flex-1 truncate">
							{showSecret ? s.secretKey : `sk_${"\u2022".repeat(32)}`}
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
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="outline" size="sm" disabled={isRegenerating}>
							<RefreshCw className="size-3" />
							{isRegenerating ? t("regenerating") : t("regenerateKeys")}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("regenerateConfirmTitle")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("regenerateConfirmDescription")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									const fd = new FormData();
									fd.set("siteId", s.id);
									regenAction(fd);
								}}
							>
								{t("regenerate")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				{regenState?.success && (
					<p className="text-xs text-muted-foreground">{regenState.message}</p>
				)}
			</CardContent>
		</Card>
	);
}

function SettingsSection({ s }: { s: InferSelectModel<typeof site> }) {
	const t = useTranslations("sites.detail");
	const tc = useTranslations("common");
	const [state, formAction, isPending] = useActionState(updateSite, null);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("siteSettings")}</CardTitle>
			</CardHeader>
			<CardContent>
				<form action={formAction} className="flex flex-col gap-4">
					<input type="hidden" name="siteId" value={s.id} />
					<div className="flex flex-col gap-2">
						<Label htmlFor="name">{tc("name")}</Label>
						<Input id="name" name="name" defaultValue={s.name} required />
						{state?.errors?.name && (
							<p className="text-xs text-destructive">{state.errors.name[0]}</p>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="domain">{tc("domain")}</Label>
						<Input
							id="domain"
							name="domain"
							defaultValue={s.domain ?? ""}
							placeholder={t("domainPlaceholder")}
							required
						/>
						{state?.errors?.domain && (
							<p className="text-xs text-destructive">
								{state.errors.domain[0]}
							</p>
						)}
					</div>
					<Button
						variant="outline"
						type="submit"
						size="sm"
						disabled={isPending}
					>
						{isPending ? tc("saving") : t("saveChanges")}
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
	const t = useTranslations("sites.detail");
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
								{t("difficulty", { value: p.difficulty })}
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
						{t("deletePuzzle")}
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<ConfirmDeleteDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={t("deletePuzzle")}
				description={t("deletePuzzleDescription")}
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
	const t = useTranslations("sites.detail");
	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("puzzles")}</CardTitle>
				<CardDescription>
					{puzzles.length === 0
						? t("noPuzzlesYet")
						: t("puzzleCount", { count: puzzles.length })}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{puzzles.map((p) => (
					<PuzzleRow key={p.id} p={p} siteId={s.id} />
				))}
				<Button variant="outline" size="sm" asChild>
					<Link href={`/dashboard/puzzles/new?siteId=${s.id}`}>
						<Plus className="size-3" /> {t("createPuzzle")}
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

function EmbedSection({ s }: { s: InferSelectModel<typeof site> }) {
	const t = useTranslations("sites.detail");
	const siteUrl = env.NEXT_PUBLIC_SITE_URL;
	const widgetUrl = `${siteUrl}/widget/${s.siteKey}`;
	const snippet = `<div class="y-captcha" data-sitekey="${s.siteKey}"></div>
<script src="${siteUrl}/captcha.js" integrity="${process.env.CAPTCHA_JS_INTEGRITY}" crossorigin="anonymous" async defer></script>`;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("embedWidget")}</CardTitle>
				<CardDescription>{t("embedDescription")}</CardDescription>
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
					<p className="mb-3 text-sm font-medium">{t("previewLabel")}</p>
					<iframe
						src={widgetUrl}
						title={t("widgetPreviewTitle")}
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
	const t = useTranslations("sites.detail");
	const ts = useTranslations("sites");
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
					<CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
					<CardDescription>{t("dangerDescription")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setDeleteOpen(true)}
					>
						<Trash2 className="size-3" /> {ts("deleteSite")}
					</Button>
				</CardContent>
			</Card>

			<ConfirmDeleteDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={ts("deleteSite")}
				description={t("deleteSiteConfirmDescription")}
				confirmText={s.name}
				onConfirm={handleDelete}
			/>
		</>
	);
}
