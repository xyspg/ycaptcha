"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createImageSet } from "./actions";

export function CreateImageSetDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (
      prev: Awaited<ReturnType<typeof createImageSet>>,
      formData: FormData,
    ) => {
      const result = await createImageSet(prev, formData);
      if (result?.success && result.values?.id) {
        setOpen(false);
        router.push(`/dashboard/image-sets/${result.values.id}`);
      }
      return result;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Create Image Set
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Image Set</DialogTitle>
          <DialogDescription>
            Give your image set a name. You can upload images after creating it.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. NYC Subway Signs"
              required
            />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <Button variant="outline" type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Image Set"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
