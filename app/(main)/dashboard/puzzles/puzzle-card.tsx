"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import { deletePuzzle } from "./[id]/actions";

interface PuzzleCardProps {
	id: string;
	prompt: string;
	siteName: string;
	difficulty: number;
	imageSetName: string;
	correctCount: number;
	enabled: boolean;
}

export function PuzzleCard({
	id,
	prompt,
	siteName,
	difficulty,
	imageSetName,
	correctCount,
	enabled,
}: PuzzleCardProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);

	const handleDelete = async () => {
		const fd = new FormData();
		fd.set("puzzleId", id);
		await deletePuzzle(null, fd);
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<Link href={`/dashboard/puzzles/${id}`}>
						<Card
							className={`transition-colors hover:bg-accent/50 dark:hover:bg-accent/30 ${!enabled ? "opacity-50" : ""}`}
						>
							<CardHeader>
								<CardTitle className="text-base">
									{prompt}
									{!enabled && (
										<span className="ml-2 text-xs font-normal text-muted-foreground">
											(disabled)
										</span>
									)}
								</CardTitle>
								<CardDescription>
									{siteName} &middot; difficulty {difficulty}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>Image set: {imageSetName}</span>
									<span>&middot;</span>
									<span>{correctCount} correct per challenge</span>
								</div>
							</CardContent>
						</Card>
					</Link>
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
				onConfirm={handleDelete}
			/>
		</>
	);
}
