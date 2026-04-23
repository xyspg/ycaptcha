"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { formatDuration } from "@/lib/utils";
import { deleteAudio, type ReferencingPuzzle } from "./actions";

interface AudioCardProps {
  id: string;
  name: string;
  durationMs: number | null;
  createdAt: string;
}

const WAVEFORM_BARS = 50;
const WAVEFORM_COLORS = [
  "bg-violet-300",
  "bg-violet-400",
  "bg-violet-500",
  "bg-purple-500",
  "bg-purple-600",
  "bg-indigo-500",
];

function Waveform({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const offset = ((hash % 1000) + 1000) / 160;

  return (
    <div aria-hidden className="flex h-7 items-center gap-[2px]">
      {Array.from({ length: WAVEFORM_BARS }).map((_, j) => {
        const height = 20 + Math.abs(Math.sin(j * 0.6 + offset)) * 80;
        const opacity = 0.35 + Math.abs(Math.cos(j * 0.4 + offset)) * 0.55;
        const colorIndex =
          (Math.floor(Math.abs(Math.sin(j * 1.3 + offset * 0.7)) * 100) +
            Math.abs(hash)) %
          WAVEFORM_COLORS.length;
        return (
          <div
            key={j}
            className={`flex-1 rounded-[1px] ${WAVEFORM_COLORS[colorIndex]}`}
            style={{ height: `${height}%`, opacity }}
          />
        );
      })}
    </div>
  );
}

export function AudioCard({ id, name, durationMs, createdAt }: AudioCardProps) {
  const t = useTranslations("audio");
  const tc = useTranslations("common");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedPuzzles, setBlockedPuzzles] = useState<ReferencingPuzzle[]>([]);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.set("audioId", id);
    const result = await deleteAudio(null, fd);
    if (result?.referencingPuzzles) {
      setBlockedPuzzles(result.referencingPuzzles);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link href={`/dashboard/audio/${id}`}>
            <Card className="transition-colors hover:bg-accent/50 dark:hover:bg-accent/30">
              <CardHeader>
                <CardTitle className="text-base">{name}</CardTitle>
                <CardDescription>
                  {formatDuration(durationMs)}
                  {" · "}
                  {createdAt}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Waveform seed={id} />
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
            {t("deleteAudio")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteAudio")}
        description={t("deleteAudioDescription")}
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
    </>
  );
}
