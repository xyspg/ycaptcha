"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Upload, X } from "lucide-react";
import {
  updateImageSetName,
  uploadImages,
  deleteImage,
  deleteImageSet,
  type ActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageSetDetailProps {
  set: { id: string; name: string };
  images: { id: string; url: string; name: string | null }[];
}

function NameEditor({ set }: { set: { id: string; name: string } }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await updateImageSetName(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{set.name}</h1>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="setId" value={set.id} />
      <Input
        name="name"
        defaultValue={set.name}
        className="h-9 w-60"
        autoFocus
        required
      />
      <Button type="submit" size="sm" disabled={isPending}>
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setEditing(false)}
      >
        Cancel
      </Button>
      {state?.errors?.name && (
        <span className="text-xs text-destructive">{state.errors.name[0]}</span>
      )}
    </form>
  );
}

function ImageUploader({ setId }: { setId: string }) {
  const [state, formAction, isPending] = useActionState(uploadImages, null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files;
      fileInputRef.current.form?.requestSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      e.target.form?.requestSubmit();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Images</CardTitle>
        <CardDescription>
          Drag and drop images or click to select files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <input type="hidden" name="setId" value={setId} />
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isPending
                ? "Uploading..."
                : "Drop images here or click to browse"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              name="files"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </label>
        </form>
        {state?.success && (
          <p className="mt-2 text-xs text-muted-foreground">{state.message}</p>
        )}
        {state?.errors?.files && (
          <p className="mt-2 text-xs text-destructive">
            {state.errors.files[0]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ImageCard({
  img,
  setId,
}: {
  img: { id: string; url: string; name: string | null };
  setId: string;
}) {
  const [state, formAction, isPending] = useActionState(deleteImage, null);

  return (
    <div className="group relative overflow-hidden rounded-md border">
      <img
        src={img.url}
        alt={img.name ?? ""}
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-start justify-end bg-black/0 p-1 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
        <form action={formAction}>
          <input type="hidden" name="imageId" value={img.id} />
          <input type="hidden" name="setId" value={setId} />
          <Button
            type="submit"
            variant="destructive"
            size="icon-xs"
            disabled={isPending}
          >
            <Trash2 className="size-3" />
          </Button>
        </form>
      </div>
      {img.name && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
          <p className="truncate text-xs text-white">{img.name}</p>
        </div>
      )}
      {state?.errors?.imageId && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/90 p-2">
          <p className="text-center text-xs text-white">
            {state.errors.imageId[0]}
          </p>
        </div>
      )}
    </div>
  );
}

export function ImageSetDetail({ set, images }: ImageSetDetailProps) {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteImageSet,
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/image-sets">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <NameEditor set={set} />
      </div>

      <ImageUploader setId={set.id} />

      {/* Image Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Images{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({images.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No images yet. Upload some above.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {images.map((img) => (
                <ImageCard key={img.id} img={img} setId={set.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deleting this image set will also remove all images from storage.
            Puzzles using this set will break.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteAction}>
            <input type="hidden" name="setId" value={set.id} />
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="size-3" />
              {isDeleting ? "Deleting..." : "Delete Image Set"}
            </Button>
          </form>
          {deleteState?.errors?.setId && (
            <p className="mt-2 text-xs text-destructive">
              {deleteState.errors.setId[0]}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
