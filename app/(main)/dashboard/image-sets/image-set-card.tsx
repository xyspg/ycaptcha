"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImageSetThumbnail } from "@/components/image-set-thumbnail";
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
import { deleteImageSet } from "./actions";

interface ImageSetCardProps {
	id: string;
	name: string;
	imageCount: number;
	createdAt: string;
	images: { id: string; url: string; name: string | null }[];
}

export function ImageSetCard({
	id,
	name,
	imageCount,
	createdAt,
	images,
}: ImageSetCardProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);

	const handleDelete = async () => {
		const fd = new FormData();
		fd.set("setId", id);
		await deleteImageSet(null, fd);
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<Link href={`/dashboard/image-sets/${id}`}>
						<Card className="transition-colors hover:bg-accent/50 dark:hover:bg-accent/30">
							<CardHeader>
								<CardTitle className="text-base">{name}</CardTitle>
								<CardDescription>
									{imageCount} image{imageCount === 1 ? "" : "s"}
									{" · "}
									{createdAt}
								</CardDescription>
							</CardHeader>
							{images.length > 0 && (
								<CardContent>
									<ImageSetThumbnail images={images} />
								</CardContent>
							)}
						</Card>
					</Link>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem
						className="text-destructive focus:text-destructive"
						onSelect={() => setDeleteOpen(true)}
					>
						<Trash2 className="size-3.5" />
						Delete Image Set
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<ConfirmDeleteDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete Image Set"
				description="This will permanently delete this image set and all its images. Puzzles using this set will also be deleted."
				onConfirm={handleDelete}
			/>
		</>
	);
}
