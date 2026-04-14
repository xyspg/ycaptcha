"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PuzzlePreviewPanel } from "@/app/(main)/dashboard/puzzles/puzzle-preview";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	CAPTCHA_GRID_SIZE,
	DEFAULT_CORRECT_COUNT,
	DIFFICULTY_PRESETS,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ImageData {
	id: string;
	url: string;
	name: string | null;
}

type CorrectCountMode = "exact" | "range";

interface PuzzleDefaultValues {
	prompt: string;
	correctImageIds: string[];
	incorrectImageIds: string[] | null;
	correctCount: number;
	correctCountMax: number | null;
	difficulty: number;
}

export function usePuzzleConfig(defaultValues?: PuzzleDefaultValues) {
	const [prompt, setPrompt] = useState(defaultValues?.prompt ?? "");
	const [correctIds, setCorrectIds] = useState<Set<string>>(
		new Set(defaultValues?.correctImageIds ?? []),
	);
	const [incorrectIds, setIncorrectIds] = useState<Set<string>>(
		new Set(defaultValues?.incorrectImageIds ?? []),
	);
	const [handPickIncorrect, setHandPickIncorrect] = useState(
		defaultValues?.incorrectImageIds !== null &&
			defaultValues?.incorrectImageIds !== undefined,
	);
	const [correctCount, setCorrectCount] = useState(
		defaultValues?.correctCount ?? DEFAULT_CORRECT_COUNT,
	);
	const [correctCountMax, setCorrectCountMax] = useState<number | null>(
		defaultValues?.correctCountMax ?? null,
	);
	const [correctCountMode, setCorrectCountMode] = useState<CorrectCountMode>(
		defaultValues?.correctCountMax !== null &&
			defaultValues?.correctCountMax !== undefined
			? "range"
			: "exact",
	);
	const [difficulty, setDifficulty] = useState(
		defaultValues?.difficulty ?? 0.5,
	);
	const [advancedOpen, setAdvancedOpen] = useState(false);

	const toggleCorrect = (id: string) => {
		setCorrectIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
				setIncorrectIds((p) => {
					const n = new Set(p);
					n.delete(id);
					return n;
				});
			}
			return next;
		});
	};

	const toggleIncorrect = (id: string) => {
		if (correctIds.has(id)) return;
		setIncorrectIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const maxCorrectCount = Math.min(correctIds.size, CAPTCHA_GRID_SIZE - 1);
	const effectiveCorrectCount =
		Math.min(correctCount, maxCorrectCount) || correctCount;
	const effectiveCorrectCountMax =
		correctCountMode === "range" && correctCountMax
			? Math.min(correctCountMax, maxCorrectCount)
			: null;
	const displayCount = effectiveCorrectCountMax
		? `${effectiveCorrectCount}–${effectiveCorrectCountMax}`
		: `${effectiveCorrectCount}`;
	const requiredCorrect = Math.ceil(effectiveCorrectCount * difficulty);

	// Preview just uses the minimum of the range — no randomness needed for a preview
	const previewCorrectCount = effectiveCorrectCount;

	const resetSelections = () => {
		setCorrectIds(new Set());
		setIncorrectIds(new Set());
	};

	return {
		prompt,
		setPrompt,
		correctIds,
		incorrectIds,
		handPickIncorrect,
		setHandPickIncorrect,
		setIncorrectIds,
		resetSelections,
		correctCount,
		setCorrectCount,
		correctCountMax,
		setCorrectCountMax,
		correctCountMode,
		setCorrectCountMode,
		difficulty,
		setDifficulty,
		advancedOpen,
		setAdvancedOpen,
		toggleCorrect,
		toggleIncorrect,
		maxCorrectCount,
		effectiveCorrectCount,
		effectiveCorrectCountMax,
		displayCount,
		requiredCorrect,
		previewCorrectCount,
	};
}

export function PuzzleHiddenFields({
	config,
}: {
	config: ReturnType<typeof usePuzzleConfig>;
}) {
	return (
		<>
			<input
				type="hidden"
				name="correctImageIds"
				value={JSON.stringify(Array.from(config.correctIds))}
			/>
			<input
				type="hidden"
				name="incorrectImageIds"
				value={
					config.handPickIncorrect
						? JSON.stringify(Array.from(config.incorrectIds))
						: ""
				}
			/>
			<input
				type="hidden"
				name="correctCount"
				value={config.effectiveCorrectCount}
			/>
			<input
				type="hidden"
				name="correctCountMax"
				value={config.effectiveCorrectCountMax ?? ""}
			/>
			<input type="hidden" name="difficulty" value={config.difficulty} />
		</>
	);
}

export function PromptField({
	config,
	errors,
}: {
	config: ReturnType<typeof usePuzzleConfig>;
	errors?: string[];
}) {
	const t = useTranslations("puzzles.create");
	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("prompt")}</CardTitle>
				<CardDescription>{t("promptDescription")}</CardDescription>
			</CardHeader>
			<CardContent>
				<Input
					name="prompt"
					value={config.prompt}
					onChange={(e) => config.setPrompt(e.target.value)}
					placeholder={t("promptPlaceholder")}
					required
				/>
				{errors && <p className="mt-1 text-xs text-destructive">{errors[0]}</p>}
			</CardContent>
		</Card>
	);
}

export function CorrectImageGrid({
	images,
	config,
	errors,
}: {
	images: ImageData[];
	config: ReturnType<typeof usePuzzleConfig>;
	errors?: string[];
}) {
	const t = useTranslations("puzzles.create");
	const te = useTranslations("puzzles.edit");
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{te("correctImages")}{" "}
					<span className="text-sm font-normal text-muted-foreground">
						{t("tagged", { count: config.correctIds.size })}
					</span>
				</CardTitle>
				<CardDescription>
					{t("tagDescription", { count: config.displayCount })}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ImageSelectionGrid
					images={images}
					selectedIds={config.correctIds}
					onToggle={config.toggleCorrect}
					color="green"
				/>
				{errors && <p className="mt-2 text-xs text-destructive">{errors[0]}</p>}
			</CardContent>
		</Card>
	);
}

export function AdvancedSettings({
	images,
	config,
	errors,
}: {
	images: ImageData[];
	config: ReturnType<typeof usePuzzleConfig>;
	errors?: Record<string, string[] | undefined>;
}) {
	const t = useTranslations("puzzles.create");
	if (config.correctIds.size === 0) return null;

	return (
		<Card className="sm:max-w-[50%]">
			<CardHeader>
				<button
					type="button"
					onClick={() => config.setAdvancedOpen(!config.advancedOpen)}
					className="flex w-full items-center justify-between"
				>
					<CardTitle>{t("advancedSettings")}</CardTitle>
					<ChevronDown
						className={cn(
							"size-5 text-muted-foreground transition-transform",
							config.advancedOpen && "rotate-180",
						)}
					/>
				</button>
			</CardHeader>
			{config.advancedOpen && (
				<CardContent className="flex flex-col gap-6">
					<div className="flex flex-col gap-6">
						<CorrectCountSection config={config} errors={errors} />
						<DifficultySection config={config} />
					</div>
					<IncorrectImageSection images={images} config={config} />
				</CardContent>
			)}
		</Card>
	);
}

export function PuzzlePreviewSidebar({
	images,
	config,
}: {
	images: ImageData[];
	config: ReturnType<typeof usePuzzleConfig>;
}) {
	return (
		<PuzzlePreviewPanel
			prompt={config.prompt}
			images={images}
			correctIds={config.correctIds}
			incorrectIds={config.incorrectIds}
			handPickIncorrect={config.handPickIncorrect}
			correctCount={config.previewCorrectCount}
			difficulty={config.difficulty}
		/>
	);
}

// --- Internal sub-components ---

function ImageSelectionGrid({
	images,
	selectedIds,
	onToggle,
	color,
}: {
	images: ImageData[];
	selectedIds: Set<string>;
	onToggle: (id: string) => void;
	color: "green" | "red";
}) {
	const borderClass =
		color === "green"
			? "border-green-500 ring-2 ring-green-500/30"
			: "border-red-500 ring-2 ring-red-500/30";
	const badgeClass = color === "green" ? "bg-green-500" : "bg-red-500";

	return (
		<div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
			{images.map((img) => {
				const isSelected = selectedIds.has(img.id);
				return (
					<button
						key={img.id}
						type="button"
						onClick={() => onToggle(img.id)}
						className={cn(
							"relative aspect-square overflow-hidden rounded-md border-2 transition-all",
							isSelected
								? borderClass
								: "border-transparent hover:border-muted-foreground/30",
						)}
					>
						<img
							src={img.url}
							alt={img.name ?? ""}
							className="h-full w-full object-cover"
							draggable={false}
						/>
						{isSelected && (
							<div
								className={cn(
									"absolute top-1 right-1 flex size-5 items-center justify-center rounded-full",
									badgeClass,
								)}
							>
								<Check className="size-3 text-white" strokeWidth={3} />
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
}

function CorrectCountSection({
	config,
	errors,
}: {
	config: ReturnType<typeof usePuzzleConfig>;
	errors?: Record<string, string[] | undefined>;
}) {
	const t = useTranslations("puzzles.create");
	return (
		<div className="flex flex-col gap-3">
			<div>
				<p className="text-sm font-medium">{t("correctPerChallenge")}</p>
				<p className="text-xs text-muted-foreground">
					{t("correctPerChallengeHelp")}
				</p>
			</div>
			<select
				value={config.correctCountMode}
				onChange={(e) => {
					const mode = e.target.value as CorrectCountMode;
					config.setCorrectCountMode(mode);
					if (mode === "exact") {
						config.setCorrectCountMax(null);
					} else {
						config.setCorrectCountMax(
							Math.min(
								config.effectiveCorrectCount + 2,
								config.maxCorrectCount,
							),
						);
					}
				}}
				className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
			>
				<option value="exact">{t("exactNumber")}</option>
				<option value="range">{t("randomRange")}</option>
			</select>

			{config.correctCountMode === "exact" ? (
				<div className="flex items-center gap-4">
					<Slider
						value={[config.effectiveCorrectCount]}
						onValueChange={([v]) => config.setCorrectCount(v)}
						min={1}
						max={config.maxCorrectCount}
						step={1}
						className="flex-1"
					/>
					<span className="w-8 text-right text-sm font-mono">
						{config.effectiveCorrectCount}
					</span>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-4">
						<span className="w-8 text-xs text-muted-foreground">
							{t("min")}
						</span>
						<Slider
							value={[config.effectiveCorrectCount]}
							onValueChange={([v]) => {
								config.setCorrectCount(v);
								if (config.correctCountMax && v > config.correctCountMax) {
									config.setCorrectCountMax(v);
								}
							}}
							min={1}
							max={config.maxCorrectCount}
							step={1}
							className="flex-1"
						/>
						<span className="w-8 text-right text-sm font-mono">
							{config.effectiveCorrectCount}
						</span>
					</div>
					<div className="flex items-center gap-4">
						<span className="w-8 text-xs text-muted-foreground">
							{t("max")}
						</span>
						<Slider
							value={[
								config.effectiveCorrectCountMax ?? config.effectiveCorrectCount,
							]}
							onValueChange={([v]) => config.setCorrectCountMax(v)}
							min={config.effectiveCorrectCount}
							max={config.maxCorrectCount}
							step={1}
							className="flex-1"
						/>
						<span className="w-8 text-right text-sm font-mono">
							{config.effectiveCorrectCountMax ?? config.effectiveCorrectCount}
						</span>
					</div>
				</div>
			)}
			{errors?.correctCount && (
				<p className="text-xs text-destructive">{errors.correctCount[0]}</p>
			)}
			{errors?.correctCountMax && (
				<p className="text-xs text-destructive">{errors.correctCountMax[0]}</p>
			)}
		</div>
	);
}

function DifficultySection({
	config,
}: {
	config: ReturnType<typeof usePuzzleConfig>;
}) {
	const t = useTranslations("puzzles.create");
	const td = useTranslations("difficulty");
	const pluralCount =
		config.effectiveCorrectCount === 1 && !config.effectiveCorrectCountMax
			? 1
			: 2;
	const difficultyLabelFor = (label: string) => {
		switch (label) {
			case "Easy":
				return td("easy");
			case "Medium":
				return td("medium");
			case "Hard":
				return td("hard");
			default:
				return label;
		}
	};
	return (
		<div className="flex flex-col gap-3">
			<div>
				<p className="text-sm font-medium">{t("difficultyLabel")}</p>
				<p className="text-xs text-muted-foreground">
					{t("difficultyHelp", {
						required: config.requiredCorrect,
						total: config.displayCount,
						count: pluralCount,
					})}
				</p>
			</div>
			<div className="flex gap-2">
				{DIFFICULTY_PRESETS.map((preset) => (
					<Button
						key={preset.label}
						type="button"
						variant={config.difficulty === preset.value ? "default" : "outline"}
						size="sm"
						onClick={() => config.setDifficulty(preset.value)}
					>
						{difficultyLabelFor(preset.label)}
					</Button>
				))}
			</div>
			<div className="flex items-center gap-4">
				<Slider
					value={[config.difficulty]}
					onValueChange={([v]) => config.setDifficulty(v)}
					min={0.1}
					max={1}
					step={0.05}
					className="flex-1"
				/>
				<span className="w-12 text-right text-sm font-mono">
					{config.difficulty.toFixed(2)}
				</span>
			</div>
		</div>
	);
}

function IncorrectImageSection({
	images,
	config,
}: {
	images: ImageData[];
	config: ReturnType<typeof usePuzzleConfig>;
}) {
	const t = useTranslations("puzzles.create");
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium">{t("handPickIncorrect")}</p>
					<p className="text-xs text-muted-foreground">
						{t("handPickIncorrectHelp")}
					</p>
				</div>
				<Switch
					checked={config.handPickIncorrect}
					onCheckedChange={(checked) => {
						config.setHandPickIncorrect(checked);
						if (!checked) config.setIncorrectIds(new Set());
					}}
				/>
			</div>
			{config.handPickIncorrect && (
				<>
					<ImageSelectionGrid
						images={images.filter((img) => !config.correctIds.has(img.id))}
						selectedIds={config.incorrectIds}
						onToggle={config.toggleIncorrect}
						color="red"
					/>
					<p className="text-xs text-muted-foreground">
						{t("incorrectSelected", { count: config.incorrectIds.size })}
					</p>
				</>
			)}
		</div>
	);
}
