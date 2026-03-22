"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePuzzle, deletePuzzle } from "./actions";
import { CAPTCHA_GRID_SIZE, DIFFICULTY_PRESETS } from "@/lib/types";
import { PuzzlePreviewPanel } from "@/components/puzzle-preview";
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

interface PuzzleDetailProps {
  puzzle: {
    id: string;
    prompt: string;
    difficulty: number;
    correctImageIds: string[];
    incorrectImageIds: string[] | null;
    correctCount: number;
    imageSetId: string;
  };
  siteName: string;
  images: { id: string; url: string; name: string | null }[];
}

export function PuzzleDetail({ puzzle: p, siteName, images }: PuzzleDetailProps) {
  const [prompt, setPrompt] = useState(p.prompt);
  const [correctIds, setCorrectIds] = useState<Set<string>>(
    new Set(p.correctImageIds),
  );
  const [incorrectIds, setIncorrectIds] = useState<Set<string>>(
    new Set(p.incorrectImageIds ?? []),
  );
  const [handPickIncorrect, setHandPickIncorrect] = useState(
    p.incorrectImageIds !== null,
  );
  const [correctCount, setCorrectCount] = useState(p.correctCount);
  const [difficulty, setDifficulty] = useState(p.difficulty);

  const [state, formAction, isPending] = useActionState(updatePuzzle, null);
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deletePuzzle,
    null,
  );

  const toggleCorrect = (id: string) => {
    setCorrectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setIncorrectIds((pr) => {
          const n = new Set(pr);
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

  const maxCorrectCount = Math.min(correctIds.size, CAPTCHA_GRID_SIZE - 1);
  const effectiveCorrectCount = Math.min(correctCount, maxCorrectCount) || correctCount;
  const requiredCorrect = Math.ceil(effectiveCorrectCount * difficulty);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/puzzles">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Puzzle</h1>
          <p className="text-sm text-muted-foreground">{siteName}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: config panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">

      <form action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="puzzleId" value={p.id} />
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
        <input type="hidden" name="correctCount" value={effectiveCorrectCount} />
        <input type="hidden" name="difficulty" value={difficulty} />

        {/* Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
            <CardDescription>
              The word shown after &quot;Select all images with&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. trains, buses, crosswalks"
              required
            />
            {state?.errors?.prompt && (
              <p className="mt-1 text-xs text-destructive">
                {state.errors.prompt[0]}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Correct Images */}
        <Card>
          <CardHeader>
            <CardTitle>
              Correct Images{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({correctIds.size} tagged)
              </span>
            </CardTitle>
            <CardDescription>
              Tag all images that are correct answers. Each challenge will
              randomly show {effectiveCorrectCount} of them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {images.map((img) => {
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

        {/* Correct Count per Challenge */}
        {correctIds.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Correct Images per Challenge</CardTitle>
              <CardDescription>
                How many correct images to show in each 3x3 grid.
                The rest will be filled with random incorrect images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Slider
                  value={[effectiveCorrectCount]}
                  onValueChange={([v]) => setCorrectCount(v)}
                  min={1}
                  max={maxCorrectCount}
                  step={1}
                  className="flex-1"
                />
                <span className="w-8 text-right text-sm font-mono">
                  {effectiveCorrectCount}
                </span>
              </div>
              {state?.errors?.correctCount && (
                <p className="mt-2 text-xs text-destructive">
                  {state.errors.correctCount[0]}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hand-pick incorrect */}
        {correctIds.size > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hand-pick Incorrect Images</CardTitle>
                  <CardDescription>
                    Optional. If off, wrong answers are randomly drawn.
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
                  {images
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
                              <Check className="size-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {incorrectIds.size} incorrect image{incorrectIds.size === 1 ? "" : "s"} selected
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
                of {effectiveCorrectCount} correct image
                {effectiveCorrectCount === 1 ? "" : "s"} to pass.
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
                <span className="w-12 text-right font-mono text-sm">
                  {difficulty.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending || correctIds.size === 0}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {state?.success && (
            <p className="text-xs text-muted-foreground">{state.message}</p>
          )}
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deleting this puzzle will remove it from the site. Existing captcha
            sessions using this puzzle will stop working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteAction}>
            <input type="hidden" name="puzzleId" value={p.id} />
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="size-3" />
              {isDeleting ? "Deleting..." : "Delete Puzzle"}
            </Button>
          </form>
          {deleteState?.errors?.puzzleId && (
            <p className="mt-2 text-xs text-destructive">
              {deleteState.errors.puzzleId[0]}
            </p>
          )}
        </CardContent>
      </Card>

        </div>

        {/* Right: sticky preview */}
        <PuzzlePreviewPanel
          prompt={prompt}
          images={images}
          correctIds={correctIds}
          incorrectIds={incorrectIds}
          handPickIncorrect={handPickIncorrect}
          correctCount={effectiveCorrectCount}
          difficulty={difficulty}
        />
      </div>
    </div>
  );
}
