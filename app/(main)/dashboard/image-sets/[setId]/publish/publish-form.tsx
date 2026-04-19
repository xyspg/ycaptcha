"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  type ActionState,
  publishGalleryItem,
} from "@/app/(main)/(gallery)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Img {
  id: string;
  url: string;
  name: string | null;
  contentHash: string | null;
}

interface PublishFormProps {
  setId: string;
  setName: string;
  images: Img[];
  authorName: string;
}

export function PublishForm({
  setId,
  setName,
  images,
  authorName,
}: PublishFormProps) {
  const [state, formAction, isPending] = useActionState(
    publishGalleryItem,
    null as ActionState,
  );

  const tooFewImages = images.length < 9;
  const fieldError = (field: string) => state?.errors?.[field]?.[0];
  const formError = state?.errors?._?.[0] ?? state?.message;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link
        href={`/dashboard/image-sets/${setId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {setName}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
          <Sparkles className="size-3.5" />
          Publish to gallery
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Share <span className="italic">{setName}</span> as an image set
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          You're sharing the below <strong>image pool</strong>. Be advised that
          others can use your images freely on their sites.
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Gallery items are <strong>frozen snapshots</strong>. Editing or
          deleting this image set afterwards won't change what's public.
        </p>
      </header>

      {tooFewImages && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
          This set has {images.length} image{images.length === 1 ? "" : "s"}.
          Gallery items need at least 9 images (3×3 grid). Add more before
          publishing.
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-8">
        <input type="hidden" name="imageSetId" value={setId} />

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gallery-title">Title</Label>
            <Input
              id="gallery-title"
              name="title"
              placeholder=""
              required
              maxLength={80}
            />
            {fieldError("title") && (
              <p className="text-xs text-destructive">{fieldError("title")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gallery-description">Description (optional)</Label>
            <textarea
              id="gallery-description"
              name="description"
              rows={3}
              maxLength={500}
              placeholder=""
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">
              What's going out ({images.length} image
              {images.length === 1 ? "" : "s"})
            </h2>
            <p className="text-sm text-muted-foreground">
              Every image below will be copied to the gallery and made public.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square overflow-hidden rounded-md bg-muted"
              >
                <Image
                  src={img.url}
                  alt={img.name ?? ""}
                  fill
                  sizes="(max-width: 640px) 25vw, 150px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6">
          <h2 className="text-base font-semibold">Before you publish</h2>

          <label
            htmlFor="publish-anonymous"
            className="flex items-start gap-3 text-sm"
          >
            <Checkbox
              id="publish-anonymous"
              name="anonymous"
              value="on"
              className="mt-0.5"
            />
            <span>
              Publish anonymously
              <span className="block text-xs text-muted-foreground">
                Otherwise you'll be credited as{" "}
                <strong className="text-foreground">{authorName}</strong>.
              </span>
            </span>
          </label>

          <label
            htmlFor="publish-terms"
            className="flex items-start gap-3 text-sm"
          >
            <Checkbox
              id="publish-terms"
              name="termsAccepted"
              value="on"
              required
              className="mt-0.5"
            />
            <span className="flex flex-col gap-1">
              <span>
                I have read and agree to the{" "}
                <Link
                  href="/legal/acceptable-use-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4 hover:text-foreground"
                >
                  Acceptable Use Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4 hover:text-foreground"
                >
                  Privacy Policy
                </Link>
                .
              </span>
              <span className="text-xs text-muted-foreground">
                I understand these images may become permanently public and
                reusable by anyone in the Gallery.
              </span>
            </span>
          </label>
          {fieldError("termsAccepted") && (
            <p className="text-xs text-destructive">
              {fieldError("termsAccepted")}
            </p>
          )}
        </section>

        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Link href={`/dashboard/image-sets/${setId}`}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isPending || tooFewImages}
            className="rounded-full bg-amber-600 px-5 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
          >
            <Sparkles className="size-4" />
            {isPending ? "Publishing…" : "Publish to gallery"}
          </Button>
        </div>
      </form>
    </div>
  );
}
