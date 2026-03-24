"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Trash2 } from "lucide-react";
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
    correctCountMax: number | null;
    imageSetId: string;
  };
  siteName: string;
  images: { id: string; url: string; name: string | null }[];
}

type CorrectCountMode = "exact" | "range";

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
  const [correctCountMax, setCorrectCountMax] = useState<number | null>(p.correctCountMax);
  const [correctCountMode, setCorrectCountMode] = useState<CorrectCountMode>(
    p.correctCountMax !== null ? "range" : "exact",
  );
  const [difficulty, setDifficulty] = useState(p.difficulty);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
  const effectiveCorrectCountMax =
    correctCountMode === "range" && correctCountMax
      ? Math.min(correctCountMax, maxCorrectCount)
      : null;
  const displayCount = effectiveCorrectCountMax
    ? `${effectiveCorrectCount}–${effectiveCorrectCountMax}`
    : `${effectiveCorrectCount}`;
  const requiredCorrect = Math.ceil(effectiveCorrectCount * difficulty);
  const previewCorrectCount = effectiveCorrectCountMax
    ? effectiveCorrectCount + Math.floor(Math.random() * (effectiveCorrectCountMax - effectiveCorrectCount + 1))
    : effectiveCorrectCount;

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
        <input
          type="hidden"
          name="correctCountMax"
          value={effectiveCorrectCountMax ?? ""}
        />
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
              randomly show {displayCount} of them.
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

        {/* Advanced Settings */}
        {correctIds.size > 0 && (
          <Card className="sm:max-w-[50%]">
            <CardHeader>
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex w-full items-center justify-between"
              >
                <CardTitle>Advanced Settings</CardTitle>
                <ChevronDown
                  className={cn(
                    "size-5 text-muted-foreground transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
              </button>
            </CardHeader>
            {advancedOpen && (
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-6">
                  {/* Correct Count per Challenge */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-medium">Correct Images per Challenge</p>
                      <p className="text-xs text-muted-foreground">
                        How many correct images to show in each 3×3 grid.
                      </p>
                    </div>
                    <select
                      value={correctCountMode}
                      onChange={(e) => {
                        const mode = e.target.value as CorrectCountMode;
                        setCorrectCountMode(mode);
                        if (mode === "exact") {
                          setCorrectCountMax(null);
                        } else {
                          setCorrectCountMax(
                            Math.min(effectiveCorrectCount + 2, maxCorrectCount),
                          );
                        }
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="exact">Exact number</option>
                      <option value="range">Random range</option>
                    </select>

                    {correctCountMode === "exact" ? (
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
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="w-8 text-xs text-muted-foreground">Min</span>
                          <Slider
                            value={[effectiveCorrectCount]}
                            onValueChange={([v]) => {
                              setCorrectCount(v);
                              if (correctCountMax && v > correctCountMax) {
                                setCorrectCountMax(v);
                              }
                            }}
                            min={1}
                            max={maxCorrectCount}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-8 text-right text-sm font-mono">
                            {effectiveCorrectCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="w-8 text-xs text-muted-foreground">Max</span>
                          <Slider
                            value={[effectiveCorrectCountMax ?? effectiveCorrectCount]}
                            onValueChange={([v]) => setCorrectCountMax(v)}
                            min={effectiveCorrectCount}
                            max={maxCorrectCount}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-8 text-right text-sm font-mono">
                            {effectiveCorrectCountMax ?? effectiveCorrectCount}
                          </span>
                        </div>
                      </div>
                    )}
                    {state?.errors?.correctCount && (
                      <p className="text-xs text-destructive">
                        {state.errors.correctCount[0]}
                      </p>
                    )}
                    {state?.errors?.correctCountMax && (
                      <p className="text-xs text-destructive">
                        {state.errors.correctCountMax[0]}
                      </p>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-medium">Difficulty</p>
                      <p className="text-xs text-muted-foreground">
                        User must select at least{" "}
                        <span className="font-medium text-foreground">
                          {requiredCorrect}
                        </span>{" "}
                        of {displayCount} correct image
                        {effectiveCorrectCount === 1 && !effectiveCorrectCountMax ? "" : "s"} to pass.
                      </p>
                    </div>
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
                  </div>
                </div>

                {/* Hand-pick incorrect — full width */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Hand-pick Incorrect Images</p>
                      <p className="text-xs text-muted-foreground">
                        If off, wrong answers are randomly drawn.
                      </p>
                    </div>
                    <Switch
                      checked={handPickIncorrect}
                      onCheckedChange={(checked) => {
                        setHandPickIncorrect(checked);
                        if (!checked) setIncorrectIds(new Set());
                      }}
                    />
                  </div>
                  {handPickIncorrect && (
                    <>
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
                      <p className="text-xs text-muted-foreground">
                        {incorrectIds.size} incorrect image{incorrectIds.size === 1 ? "" : "s"} selected
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            )}
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
          correctCount={previewCorrectCount}
          difficulty={difficulty}
        />
      </div>
    </div>
  );
}
