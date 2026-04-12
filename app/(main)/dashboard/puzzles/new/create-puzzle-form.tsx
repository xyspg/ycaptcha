"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  AdvancedSettings,
  CorrectImageGrid,
  type ImageData,
  PromptField,
  PuzzleHiddenFields,
  PuzzlePreviewSidebar,
  usePuzzleConfig,
} from "@/app/(main)/dashboard/puzzles/puzzle-config-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPuzzle } from "./actions";

interface ImageSetData {
  id: string;
  name: string;
  images: ImageData[];
}

interface CreatePuzzleFormProps {
  sites: { id: string; name: string }[];
  defaultSiteId?: string;
  imageSets: ImageSetData[];
}

export function CreatePuzzleForm({
  sites,
  defaultSiteId,
  imageSets,
}: CreatePuzzleFormProps) {
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId ?? "");
  const [selectedSetId, setSelectedSetId] = useState("");
  const config = usePuzzleConfig();

  const selectedSet = imageSets.find((s) => s.id === selectedSetId);

  const [state, formAction, isPending] = useActionState(createPuzzle, null);

  const handleSetChange = (value: string) => {
    setSelectedSetId(value);
    config.resetSelections();
    config.setAdvancedOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/puzzles">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Create Puzzle</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: config panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <form action={formAction} className="flex flex-col gap-6">
            <input type="hidden" name="siteId" value={selectedSiteId} />
            <input type="hidden" name="imageSetId" value={selectedSetId} />
            <PuzzleHiddenFields config={config} />

            {/* Site Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Site</CardTitle>
                <CardDescription>
                  Which site will this puzzle be used on?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {sites.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No sites yet.{" "}
                    <Link
                      href="/dashboard/sites"
                      className="underline hover:text-foreground"
                    >
                      Create one first
                    </Link>
                    .
                  </p>
                )}
                {state?.errors?.siteId && (
                  <p className="mt-1 text-xs text-destructive">
                    {state.errors.siteId[0]}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Image Set Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Image Set</CardTitle>
                <CardDescription>
                  Choose the image pool for this puzzle.{" "}
                  <Link
                    href="/dashboard/image-sets"
                    className="underline hover:text-foreground"
                  >
                    Manage
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  name="imageSetId"
                  value={selectedSetId}
                  onChange={(e) => handleSetChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select an image set...</option>
                  {imageSets.map((is) => (
                    <option key={is.id} value={is.id}>
                      {is.name} ({is.images.length} images)
                    </option>
                  ))}
                </select>
                {imageSets.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No image sets yet.{" "}
                    <Link
                      href="/dashboard/image-sets"
                      className="underline hover:text-foreground"
                    >
                      Create one first
                    </Link>
                    .
                  </p>
                )}
                {state?.errors?.imageSetId && (
                  <p className="mt-1 text-xs text-destructive">
                    {state.errors.imageSetId[0]}
                  </p>
                )}
              </CardContent>
            </Card>

            <PromptField config={config} errors={state?.errors?.prompt} />

            {selectedSet && (
              <CorrectImageGrid
                images={selectedSet.images}
                config={config}
                errors={state?.errors?.correctImageIds}
              />
            )}

            <AdvancedSettings
              images={selectedSet?.images ?? []}
              config={config}
              errors={state?.errors}
            />

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  config.correctIds.size === 0 ||
                  !selectedSetId ||
                  !selectedSiteId
                }
              >
                {isPending ? "Creating..." : "Create Puzzle"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/dashboard/puzzles">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>

        {/* Right: sticky preview */}
        <PuzzlePreviewSidebar
          images={selectedSet?.images ?? []}
          config={config}
        />
      </div>
    </div>
  );
}
