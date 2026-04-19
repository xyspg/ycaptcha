"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { forkGalleryItem } from "@/app/(main)/(gallery)/actions";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/types";

export function ForkButton({ slug }: { slug: string }) {
  const t = useTranslations("gallery");
  const [, formAction, isPending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await forkGalleryItem(prev, fd);
      if (result?.errors?._?.[0]) {
        toast.error(result.errors._[0]);
      }
      return result;
    },
    null as ActionState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full"
        disabled={isPending}
      >
        {isPending ? t("forking") : t("forkToMyAccount")}
      </Button>
    </form>
  );
}
