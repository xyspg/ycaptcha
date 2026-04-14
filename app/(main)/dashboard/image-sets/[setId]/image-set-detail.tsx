"use client";

import { ArrowLeft, Pencil, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	type ActionState,
	deleteImage,
	deleteImageSet,
	type ReferencingPuzzle,
	updateImageSetName,
	uploadSingleImage,
} from "../actions";

interface ImageSetDetailProps {
	set: { id: string; name: string };
	images: { id: string; url: string; name: string | null }[];
}

function NameEditor({ set }: { set: { id: string; name: string } }) {
	const tc = useTranslations("common");
	const [editing, setEditing] = useState(false);
	const [state, formAction, isPending] = useActionState(
		async (prev: ActionState, formData: FormData) => {
			const result = await updateImageSetName(prev, formData);
			if (result?.success) setEditing(false);
			return result;
		},
		null,
	);

	if (!editing) {
		return (
			<div className="flex items-center gap-2">
				<h1 className="text-2xl font-semibold">{set.name}</h1>
				<Button variant="ghost" size="icon-xs" onClick={() => setEditing(true)}>
					<Pencil className="size-3" />
				</Button>
			</div>
		);
	}

	return (
		<form action={formAction} className="flex items-center gap-2">
			<input type="hidden" name="setId" value={set.id} />
			<Input
				name="name"
				defaultValue={set.name}
				className="h-9 w-60"
				autoFocus
				required
			/>
			<Button variant="outline" type="submit" size="sm" disabled={isPending}>
				{tc("save")}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setEditing(false)}
			>
				{tc("cancel")}
			</Button>
			{state?.errors?.name && (
				<span className="text-xs text-destructive">{state.errors.name[0]}</span>
			)}
		</form>
	);
}

const MAX_INPUT_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 50;
const COMPRESS_MAX_DIM = 800;
const COMPRESS_QUALITY = 0.8;

type FileStatus =
	| { step: "pending" }
	| { step: "compressing" }
	| { step: "uploading" }
	| { step: "done" }
	| { step: "duplicate" }
	| { step: "error"; message: string };

interface QueueItem {
	id: string;
	name: string;
	file: File;
	preview?: string;
	status: FileStatus;
}

async function compressImage(file: File): Promise<File> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(
		1,
		COMPRESS_MAX_DIM / Math.max(bitmap.width, bitmap.height),
	);
	const w = Math.round(bitmap.width * scale);
	const h = Math.round(bitmap.height * scale);

	const canvas = new OffscreenCanvas(w, h);
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();

	const blob = await canvas.convertToBlob({
		type: "image/webp",
		quality: COMPRESS_QUALITY,
	});
	return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
		type: "image/webp",
	});
}

function StatusIndicator({ status }: { status: FileStatus }) {
	const t = useTranslations("imageSets.detail");
	switch (status.step) {
		case "pending":
			return (
				<span className="text-xs text-muted-foreground">
					{t("statusWaiting")}
				</span>
			);
		case "compressing":
			return (
				<span className="text-xs text-blue-500">{t("statusCompressing")}</span>
			);
		case "uploading":
			return (
				<span className="text-xs text-blue-500">{t("statusUploading")}</span>
			);
		case "done":
			return <span className="text-xs text-green-600">{t("statusDone")}</span>;
		case "duplicate":
			return (
				<span className="text-xs text-yellow-600">{t("statusDuplicate")}</span>
			);
		case "error":
			return <span className="text-xs text-destructive">{status.message}</span>;
	}
}

function ImageUploader({ setId }: { setId: string }) {
	const t = useTranslations("imageSets.detail");
	const tc = useTranslations("common");
	const [queue, setQueue] = useState<QueueItem[]>([]);
	const processingRef = useRef(false);

	const updateItem = useCallback(
		(id: string, status: FileStatus) =>
			setQueue((q) => q.map((i) => (i.id === id ? { ...i, status } : i))),
		[],
	);

	const processQueue = useCallback(
		async (items: QueueItem[]) => {
			if (processingRef.current) return;
			processingRef.current = true;

			for (const item of items) {
				// Validate size
				if (item.file.size > MAX_INPUT_FILE_SIZE) {
					updateItem(item.id, {
						step: "error",
						message: t("errorExceedsSize"),
					});
					continue;
				}

				// Compress & convert to WebP
				let prepared: File;
				try {
					updateItem(item.id, { step: "compressing" });
					prepared = await compressImage(item.file);
				} catch {
					const isHeic = item.file.name.toLowerCase().includes(".heic");
					updateItem(item.id, {
						step: "error",
						message: isHeic
							? t("errorHeicUnsupported")
							: t("errorUnsupportedFormat"),
					});
					continue;
				}

				// Upload
				try {
					updateItem(item.id, { step: "uploading" });
					const result = await uploadSingleImage(setId, prepared);
					if (result.status === "ok") {
						updateItem(item.id, { step: "done" });
					} else if (result.status === "duplicate") {
						updateItem(item.id, { step: "duplicate" });
					} else {
						updateItem(item.id, { step: "error", message: result.error });
					}
				} catch (e) {
					updateItem(item.id, {
						step: "error",
						message: e instanceof Error ? e.message : t("errorUploadFailed"),
					});
				}
			}

			processingRef.current = false;
		},
		[setId, updateItem, t],
	);

	const onDrop = useCallback(
		(
			accepted: File[],
			rejected: { file: File; errors: readonly { message: string }[] }[],
		) => {
			if (accepted.length + rejected.length > MAX_FILES) {
				toast.error(t("errorMaxFiles", { count: MAX_FILES }));
				return;
			}

			const newItems: QueueItem[] = [
				...rejected.map((r) => ({
					id: crypto.randomUUID(),
					name: r.file.name,
					file: r.file,
					status: {
						step: "error" as const,
						message: t("errorNotAnImage"),
					},
				})),
				...accepted.map((f) => ({
					id: crypto.randomUUID(),
					name: f.name,
					file: f,
					preview: URL.createObjectURL(f),
					status: { step: "pending" as const },
				})),
			];

			setQueue((prev) => [...newItems, ...prev]);
			const pending = newItems.filter((i) => i.status.step === "pending");
			if (pending.length > 0) processQueue(pending);
		},
		[processQueue, t],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "image/*": [] },
		disabled: processingRef.current,
	});

	const clearDone = () =>
		setQueue((q) =>
			q.filter(
				(i) =>
					i.status.step !== "done" &&
					i.status.step !== "duplicate" &&
					i.status.step !== "error",
			),
		);

	const hasClearable = queue.some(
		(i) =>
			i.status.step === "done" ||
			i.status.step === "duplicate" ||
			i.status.step === "error",
	);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{t("uploadImages")}</CardTitle>
						<CardDescription>{t("uploadDescription")}</CardDescription>
					</div>
					{hasClearable && (
						<Button variant="ghost" size="sm" onClick={clearDone}>
							{tc("clear")}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div
					{...getRootProps()}
					className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
						isDragActive
							? "border-primary bg-primary/5"
							: "border-muted-foreground/25 hover:border-muted-foreground/50"
					}`}
				>
					<input {...getInputProps()} />
					<Upload className="mb-2 size-6 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">{t("dropOrBrowse")}</p>
				</div>

				{queue.length > 0 && (
					<ul className="flex flex-col gap-1.5">
						{queue.map((item) => (
							<li
								key={item.id}
								className="flex items-center gap-2 rounded-md border px-3 py-2"
							>
								{item.preview ? (
									<img
										src={item.preview}
										alt=""
										className="size-8 shrink-0 rounded object-cover"
									/>
								) : (
									<div className="size-8 shrink-0 rounded bg-muted" />
								)}
								<span className="min-w-0 flex-1 truncate text-sm">
									{item.name}
								</span>
								<StatusIndicator status={item.status} />
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function ImageCard({
	img,
	setId,
}: {
	img: { id: string; url: string; name: string | null };
	setId: string;
}) {
	const [state, formAction, isPending] = useActionState(deleteImage, null);

	return (
		<div className="group relative overflow-hidden rounded-md border">
			<img
				src={img.url}
				alt={img.name ?? ""}
				className="aspect-square w-full object-cover"
				loading="lazy"
			/>
			<div className="absolute inset-0 flex items-start justify-end bg-black/0 p-1 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
				<form action={formAction}>
					<input type="hidden" name="imageId" value={img.id} />
					<input type="hidden" name="setId" value={setId} />
					<Button
						type="submit"
						variant="destructive"
						size="icon-xs"
						disabled={isPending}
					>
						<Trash2 className="size-3" />
					</Button>
				</form>
			</div>
			{img.name && (
				<div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
					<p className="truncate text-xs text-white">{img.name}</p>
				</div>
			)}
			{state?.errors?.imageId && (
				<div className="absolute inset-0 flex items-center justify-center bg-red-500/90 p-2">
					<p className="text-center text-xs text-white">
						{state.errors.imageId[0]}
					</p>
				</div>
			)}
		</div>
	);
}

export function ImageSetDetail({ set, images }: ImageSetDetailProps) {
	const t = useTranslations("imageSets");
	const td = useTranslations("imageSets.detail");
	const tc = useTranslations("common");
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [blockedPuzzles, setBlockedPuzzles] = useState<ReferencingPuzzle[]>([]);

	const handleDelete = async () => {
		const fd = new FormData();
		fd.set("setId", set.id);
		const result = await deleteImageSet(null, fd);
		if (result?.referencingPuzzles) {
			setBlockedPuzzles(result.referencingPuzzles);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon-sm" asChild>
					<Link href="/dashboard/image-sets">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<NameEditor set={set} />
			</div>

			<ImageUploader setId={set.id} />

			{/* Image Grid */}
			<Card>
				<CardHeader>
					<CardTitle>
						{td("images")}{" "}
						<span className="text-sm font-normal text-muted-foreground">
							({images.length})
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{images.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							{td("noImagesYet")}
						</p>
					) : (
						<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
							{images.map((img) => (
								<ImageCard key={img.id} img={img} setId={set.id} />
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle className="text-destructive">{td("dangerZone")}</CardTitle>
					<CardDescription>{td("dangerDescription")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setDeleteOpen(true)}
					>
						<Trash2 className="size-3" /> {t("deleteImageSet")}
					</Button>
				</CardContent>
			</Card>

			<ConfirmDeleteDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={t("deleteImageSet")}
				description={td("deleteConfirmDescription")}
				onConfirm={handleDelete}
			/>

			<AlertDialog
				open={blockedPuzzles.length > 0}
				onOpenChange={(open) => {
					if (!open) setBlockedPuzzles([]);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("cannotDeleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("cannotDeleteDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<ul className="flex flex-col gap-1 text-sm">
						{blockedPuzzles.map((p) => (
							<li key={p.puzzleId}>
								<Link
									href={`/dashboard/sites/${p.siteId}`}
									className="text-primary underline underline-offset-4 hover:text-primary/80"
								>
									{p.siteName}
								</Link>
								{" — "}
								<span className="text-muted-foreground">{p.puzzlePrompt}</span>
							</li>
						))}
					</ul>
					<AlertDialogFooter>
						<AlertDialogCancel>{tc("close")}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
