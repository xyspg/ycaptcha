"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { image, puzzle, site } from "@/lib/db/app-schema";
import type { ActionState } from "@/lib/types";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

async function requireOwnedPuzzle(puzzleId: string, userId: string) {
	const [row] = await db
		.select({ id: puzzle.id, imageSetId: puzzle.imageSetId })
		.from(puzzle)
		.innerJoin(site, and(eq(site.id, puzzle.siteId), eq(site.userId, userId)))
		.where(eq(puzzle.id, puzzleId));
	return row ?? null;
}

const updatePuzzleSchema = z
	.object({
		puzzleId: z.string().min(1),
		prompt: z
			.string()
			.min(1, "Prompt is required")
			.max(200, "Prompt is too long"),
		correctImageIds: z
			.array(z.string())
			.min(1, "Select at least 1 correct image"),
		incorrectImageIds: z.array(z.string()).nullable(),
		correctCount: z
			.number()
			.int()
			.min(1)
			.max(CAPTCHA_GRID_SIZE - 1),
		correctCountMax: z
			.number()
			.int()
			.min(1)
			.max(CAPTCHA_GRID_SIZE - 1)
			.nullable(),
		difficulty: z.number().min(0.1).max(1),
	})
	.refine((data) => data.correctCount <= data.correctImageIds.length, {
		message: "Correct count per challenge cannot exceed total correct images",
		path: ["correctCount"],
	})
	.refine(
		(data) =>
			!data.correctCountMax || data.correctCountMax >= data.correctCount,
		{
			message: "Max must be greater than or equal to min",
			path: ["correctCountMax"],
		},
	)
	.refine(
		(data) =>
			!data.correctCountMax ||
			data.correctCountMax <= data.correctImageIds.length,
		{
			message: "Max cannot exceed total correct images",
			path: ["correctCountMax"],
		},
	);

export async function updatePuzzle(
	prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const session = await requireSession();

	let correctImageIds: string[];
	let incorrectImageIds: string[] | null;
	try {
		correctImageIds = JSON.parse(
			(formData.get("correctImageIds") as string) || "[]",
		);
		incorrectImageIds = formData.get("incorrectImageIds")
			? JSON.parse(formData.get("incorrectImageIds") as string)
			: null;
	} catch {
		return { errors: { correctImageIds: ["Invalid format"] } };
	}

	const raw = {
		puzzleId: formData.get("puzzleId") as string,
		prompt: formData.get("prompt") as string,
		correctImageIds,
		incorrectImageIds,
		correctCount: Number(formData.get("correctCount")),
		correctCountMax: formData.get("correctCountMax")
			? Number(formData.get("correctCountMax"))
			: null,
		difficulty: Number(formData.get("difficulty")),
	};

	const parsed = updatePuzzleSchema.safeParse(raw);

	if (!parsed.success) {
		return { errors: z.flattenError(parsed.error).fieldErrors };
	}

	const owned = await requireOwnedPuzzle(parsed.data.puzzleId, session.user.id);
	if (!owned) {
		return { errors: { puzzleId: ["Puzzle not found"] } };
	}

	// validate all image IDs belong to the puzzle's imageSet
	const allImageIds = [
		...parsed.data.correctImageIds,
		...(parsed.data.incorrectImageIds ?? []),
	];
	const validImages = await db
		.select({ id: image.id })
		.from(image)
		.where(
			and(
				eq(image.imageSetId, owned.imageSetId),
				inArray(image.id, allImageIds),
			),
		);
	if (validImages.length !== new Set(allImageIds).size) {
		return {
			errors: {
				correctImageIds: [
					"Some images do not belong to the puzzle's image set",
				],
			},
		};
	}

	await db
		.update(puzzle)
		.set({
			prompt: parsed.data.prompt,
			correctImageIds: parsed.data.correctImageIds,
			incorrectImageIds: parsed.data.incorrectImageIds,
			correctCount: parsed.data.correctCount,
			correctCountMax: parsed.data.correctCountMax,
			difficulty: parsed.data.difficulty,
		})
		.where(eq(puzzle.id, parsed.data.puzzleId));

	revalidatePath(`/dashboard/puzzles/${parsed.data.puzzleId}`);
	return { success: true, message: "Puzzle updated" };
}

const toggleSchema = z.object({
	puzzleId: z.string().min(1),
	enabled: z.boolean(),
});

export async function togglePuzzleEnabled(puzzleId: string, enabled: boolean) {
	const session = await requireSession();

	const parsed = toggleSchema.safeParse({ puzzleId, enabled });
	if (!parsed.success) throw new Error("Invalid input");

	const owned = await requireOwnedPuzzle(parsed.data.puzzleId, session.user.id);
	if (!owned) throw new Error("Puzzle not found");

	await db
		.update(puzzle)
		.set({ enabled: parsed.data.enabled })
		.where(eq(puzzle.id, parsed.data.puzzleId));

	revalidatePath("/dashboard", "layout");
}

export async function deletePuzzle(
	prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const session = await requireSession();
	const puzzleId = formData.get("puzzleId") as string;

	if (!puzzleId) return { errors: { puzzleId: ["Missing puzzle ID"] } };

	const owned = await requireOwnedPuzzle(puzzleId, session.user.id);
	if (!owned) {
		return { errors: { puzzleId: ["Puzzle not found"] } };
	}

	await db.delete(puzzle).where(eq(puzzle.id, puzzleId));

	redirect("/dashboard/puzzles");
}
