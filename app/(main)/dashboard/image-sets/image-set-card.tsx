"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImageSetThumbnail } from "@/components/image-set-thumbnail";
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
import { deleteImageSet, type ReferencingPuzzle } from "./actions";

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
  const t = useTranslations("imageSets");
  const tc = useTranslations("common");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedPuzzles, setBlockedPuzzles] = useState<ReferencingPuzzle[]>([]);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.set("setId", id);
    const result = await deleteImageSet(null, fd);
    if (result?.referencingPuzzles) {
      setBlockedPuzzles(result.referencingPuzzles);
    }
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
                  {t("imageCount", { count: imageCount })}
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
            {t("deleteImageSet")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteImageSet")}
        description={t("deleteImageSetDescription")}
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
