import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { image, puzzle, site } from "@/lib/db/app-schema";
import { PuzzleDetail } from "./puzzle-detail";

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const [session, { id }] = await Promise.all([requireSession(), params]);

	const [puzzleData] = await db
		.select()
		.from(puzzle)
		.innerJoin(
			site,
			and(eq(site.id, puzzle.siteId), eq(site.userId, session.user.id)),
		)
		.where(eq(puzzle.id, id));

	if (!puzzleData) notFound();

	const images = await db
		.select({ id: image.id, url: image.url, name: image.name })
		.from(image)
		.where(eq(image.imageSetId, puzzleData.puzzle.imageSetId));

	return (
		<PuzzleDetail
			puzzle={{
				id: puzzleData.puzzle.id,
				prompt: puzzleData.puzzle.prompt,
				difficulty: puzzleData.puzzle.difficulty,
				correctImageIds: puzzleData.puzzle.correctImageIds as string[],
				incorrectImageIds: puzzleData.puzzle.incorrectImageIds as
					| string[]
					| null,
				correctCount: puzzleData.puzzle.correctCount,
				correctCountMax: puzzleData.puzzle.correctCountMax,
				imageSetId: puzzleData.puzzle.imageSetId,
			}}
			siteName={puzzleData.site.name}
			images={images}
		/>
	);
}
