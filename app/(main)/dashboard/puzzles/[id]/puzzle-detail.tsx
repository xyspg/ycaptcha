"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
	AdvancedSettings,
	CorrectImageGrid,
	type ImageData,
	PromptField,
	PuzzleHiddenFields,
	PuzzlePreviewSidebar,
	usePuzzleConfig,
} from "@/app/(main)/dashboard/puzzles/puzzle-config-fields";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { deletePuzzle, updatePuzzle } from "./actions";

interface PuzzleDetailProps {
	puzzle: {
		id: string;
		prompt: string;
		difficulty: number;
		correctImageIds: string[];
		incorrectImageIds: string[] | null;
		correctCount: number;
		correctCountMax: number | null;
		imageSetId: string;
	};
	siteName: string;
	images: ImageData[];
}

export function PuzzleDetail({
	puzzle: p,
	siteName,
	images,
}: PuzzleDetailProps) {
	const t = useTranslations("puzzles.edit");
	const tp = useTranslations("puzzles");
	const tc = useTranslations("common");
	const config = usePuzzleConfig({
		prompt: p.prompt,
		correctImageIds: p.correctImageIds,
		incorrectImageIds: p.incorrectImageIds,
		correctCount: p.correctCount,
		correctCountMax: p.correctCountMax,
		difficulty: p.difficulty,
	});

	const [state, formAction, isPending] = useActionState(updatePuzzle, null);
	const [deleteState, deleteAction, isDeleting] = useActionState(
		deletePuzzle,
		null,
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon-sm" asChild>
					<Link href="/dashboard/puzzles">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-semibold">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">{siteName}</p>
				</div>
			</div>

			<div className="flex flex-col gap-6 lg:flex-row">
				{/* Left: config panel */}
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					<form action={formAction} className="flex flex-col gap-6">
						<input type="hidden" name="puzzleId" value={p.id} />
						<PuzzleHiddenFields config={config} />

						<PromptField config={config} errors={state?.errors?.prompt} />

						<CorrectImageGrid
							images={images}
							config={config}
							errors={state?.errors?.correctImageIds}
						/>

						<AdvancedSettings
							images={images}
							config={config}
							errors={state?.errors}
						/>

						{/* Save */}
						<div className="flex items-center gap-3">
							<Button
								type="submit"
								disabled={isPending || config.correctIds.size === 0}
							>
								{isPending ? tc("saving") : tc("saveChanges")}
							</Button>
							{state?.success && (
								<p className="text-xs text-muted-foreground">{state.message}</p>
							)}
						</div>
					</form>

					{/* Danger Zone */}
					<Card className="border-destructive/50">
						<CardHeader>
							<CardTitle className="text-destructive">
								{t("dangerZone")}
							</CardTitle>
							<CardDescription>{t("dangerDescription")}</CardDescription>
						</CardHeader>
						<CardContent>
							<form action={deleteAction}>
								<input type="hidden" name="puzzleId" value={p.id} />
								<Button variant="destructive" size="sm" disabled={isDeleting}>
									<Trash2 className="size-3" />
									{isDeleting ? tc("deleting") : tp("deletePuzzle")}
								</Button>
							</form>
							{deleteState?.errors?.puzzleId && (
								<p className="mt-2 text-xs text-destructive">
									{deleteState.errors.puzzleId[0]}
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Right: sticky preview */}
				<PuzzlePreviewSidebar images={images} config={config} />
			</div>
		</div>
	);
}
