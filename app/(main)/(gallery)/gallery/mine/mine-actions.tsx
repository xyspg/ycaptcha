"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteGalleryItem } from "@/app/(main)/(gallery)/actions";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";

export function MineActions({ slug }: { slug: string }) {
  const t = useTranslations("gallery");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("slug", slug);
        const result = await deleteGalleryItem(null, fd);
        if (result?.errors?._?.[0]) toast.error(result.errors._[0]);
        else if (result?.success) toast.success(t("itemDeleted"));
        resolve();
      });
    });

  return (
    <>
      <div className="flex items-center justify-end border-t border-border bg-muted/40 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          {t("deleteItem")}
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={t("deleteDialogTitle")}
        description={t("deleteDialogDescription")}
        onConfirm={handleConfirm}
      />
    </>
  );
}
