"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deletePuzzle } from "./[id]/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

interface PuzzleCardProps {
  id: string;
  prompt: string;
  siteName: string;
  difficulty: number;
  imageSetName: string;
  correctCount: number;
}

export function PuzzleCard({
  id,
  prompt,
  siteName,
  difficulty,
  imageSetName,
  correctCount,
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
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{prompt}</CardTitle>
                <CardDescription>
                  {siteName} &middot; difficulty {difficulty}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Image set: {imageSetName}</span>
                  <span>&middot;</span>
                  <span>
                    {correctCount} correct image
                    {correctCount === 1 ? "" : "s"}
                  </span>
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
