"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPuzzle } from "./actions";
import { CAPTCHA_MAX_CORRECT, CAPTCHA_GRID_SIZE } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface ImageSetData {
  id: string;
  name: string;
  images: { id: string; url: string; name: string | null }[];
}

interface CreatePuzzleFormProps {
  sites: { id: string; name: string }[];
  defaultSiteId?: string;
  imageSets: ImageSetData[];
}

const DIFFICULTY_PRESETS = [
  { label: "Easy", value: 0.25 },
  { label: "Medium", value: 0.5 },
  { label: "Hard", value: 0.75 },
] as const;

export function CreatePuzzleForm({
  sites,
  defaultSiteId,
  imageSets,
}: CreatePuzzleFormProps) {
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId ?? "");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [correctIds, setCorrectIds] = useState<Set<string>>(new Set());
  const [incorrectIds, setIncorrectIds] = useState<Set<string>>(new Set());
  const [handPickIncorrect, setHandPickIncorrect] = useState(false);
  const [difficulty, setDifficulty] = useState(0.5);

  const selectedSet = imageSets.find((s) => s.id === selectedSetId);

  const [state, formAction, isPending] = useActionState(createPuzzle, null);

  const toggleCorrect = (id: string) => {
    setCorrectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= CAPTCHA_MAX_CORRECT) return prev;
        next.add(id);
        setIncorrectIds((p) => {
          const n = new Set(p);
          n.delete(id);
          return n;
        });
      }
      return next;
    });
  };

  const toggleIncorrect = (id: string) => {
    if (correctIds.has(id)) return;
    setIncorrectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSetChange = (value: string) => {
    setSelectedSetId(value);
    setCorrectIds(new Set());
    setIncorrectIds(new Set());
  };

  const requiredCorrect = Math.ceil(correctIds.size * difficulty);
  const neededIncorrect = CAPTCHA_GRID_SIZE - correctIds.size;
  const incorrectSatisfied =
    !handPickIncorrect || incorrectIds.size >= neededIncorrect;

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

      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="siteId" value={selectedSiteId} />
        <input
          type="hidden"
          name="correctImageIds"
          value={JSON.stringify(Array.from(correctIds))}
        />
        <input
          type="hidden"
          name="incorrectImageIds"
          value={
            handPickIncorrect
              ? JSON.stringify(Array.from(incorrectIds))
              : ""
          }
        />
        <input type="hidden" name="difficulty" value={difficulty} />

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
              Choose the image pool for this puzzle.
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

        {/* Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
            <CardDescription>
              The instruction shown to users. Use <code>|</code> to separate
              instruction from keyword (e.g. &quot;Select all images
              with|trains&quot;).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              name="prompt"
              placeholder="Select all images with|trains"
              required
            />
            {state?.errors?.prompt && (
              <p className="mt-1 text-xs text-destructive">
                {state.errors.prompt[0]}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Image Grid — correct selection */}
        {selectedSet && (
          <Card>
            <CardHeader>
              <CardTitle>
                Select Correct Images{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({correctIds.size}/{CAPTCHA_MAX_CORRECT})
                </span>
              </CardTitle>
              <CardDescription>
                Click images that are the correct answers. Max {CAPTCHA_MAX_CORRECT}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {selectedSet.images.map((img) => {
                  const isCorrect = correctIds.has(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggleCorrect(img.id)}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                        isCorrect
                          ? "border-green-500 ring-2 ring-green-500/30"
                          : "border-transparent hover:border-muted-foreground/30",
                      )}
                    >
                      <img
                        src={img.url}
                        alt={img.name ?? ""}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                      {isCorrect && (
                        <div className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-green-500">
                          <Check className="size-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {state?.errors?.correctImageIds && (
                <p className="mt-2 text-xs text-destructive">
                  {state.errors.correctImageIds[0]}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hand-pick incorrect images (optional) */}
        {selectedSet && correctIds.size > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hand-pick Incorrect Images</CardTitle>
                  <CardDescription>
                    Optional. If off, wrong answers are randomly drawn from
                    remaining images.
                  </CardDescription>
                </div>
                <Switch
                  checked={handPickIncorrect}
                  onCheckedChange={(checked) => {
                    setHandPickIncorrect(checked);
                    if (!checked) setIncorrectIds(new Set());
                  }}
                />
              </div>
            </CardHeader>
            {handPickIncorrect && (
              <CardContent>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {selectedSet.images
                    .filter((img) => !correctIds.has(img.id))
                    .map((img) => {
                      const isIncorrect = incorrectIds.has(img.id);
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => toggleIncorrect(img.id)}
                          className={cn(
                            "relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                            isIncorrect
                              ? "border-red-500 ring-2 ring-red-500/30"
                              : "border-transparent hover:border-muted-foreground/30",
                          )}
                        >
                          <img
                            src={img.url}
                            alt={img.name ?? ""}
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                          {isIncorrect && (
                            <div className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-500">
                              <Check
                                className="size-3 text-white"
                                strokeWidth={3}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
                <p className={cn(
                  "mt-2 text-xs",
                  handPickIncorrect && incorrectIds.size < neededIncorrect
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}>
                  {incorrectIds.size} of {neededIncorrect} required incorrect image
                  {neededIncorrect === 1 ? "" : "s"} selected
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Difficulty */}
        {correctIds.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Difficulty</CardTitle>
              <CardDescription>
                User must select at least{" "}
                <span className="font-medium text-foreground">
                  {requiredCorrect}
                </span>{" "}
                of {correctIds.size} correct image
                {correctIds.size === 1 ? "" : "s"} to pass.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                {DIFFICULTY_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant={
                      difficulty === preset.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setDifficulty(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[difficulty]}
                  onValueChange={([v]) => setDifficulty(v)}
                  min={0.1}
                  max={1}
                  step={0.05}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm font-mono">
                  {difficulty.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={
              isPending ||
              correctIds.size === 0 ||
              !selectedSetId ||
              !selectedSiteId ||
              !incorrectSatisfied
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
  );
}
