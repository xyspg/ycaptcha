"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  imageSetName: string | null;
  correctCount: number;
  enabled: boolean;
  solves: number;
  fails: number;
  passRate: number | null;
}

export function PuzzleCard({
  id,
  prompt,
  siteName,
  difficulty,
  imageSetName,
  correctCount,
  enabled,
  solves,
  fails,
  passRate,
}: PuzzleCardProps) {
  const t = useTranslations("puzzles");
  const ta = useTranslations("analytics");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.set("puzzleId", id);
    await deletePuzzle(null, fd);
  };

  const hasStats = solves > 0 || fails > 0;

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
                      {t("disabled")}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {siteName} &middot; {t("difficulty", { value: difficulty })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {imageSetName && (
                    <>
                      <span>{t("imageSet", { name: imageSetName })}</span>
                      <span>&middot;</span>
                    </>
                  )}
                  <span>
                    {t("correctPerChallenge", { count: correctCount })}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-t pt-2 text-xs tabular-nums">
                  {hasStats ? (
                    <>
                      <span className="text-muted-foreground">
                        {ta("solvesShort", { count: solves })}
                      </span>
                      <span className="text-muted-foreground">
                        {ta("failsShort", { count: fails })}
                      </span>
                      <span className="ml-auto font-medium text-foreground">
                        {passRate === null
                          ? "—"
                          : `${(passRate * 100).toFixed(1)}%`}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      {ta("noDataYet")}
                    </span>
                  )}
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
            {t("deletePuzzle")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deletePuzzle")}
        description={t("deletePuzzleDescription")}
        onConfirm={handleDelete}
      />
    </>
  );
}
