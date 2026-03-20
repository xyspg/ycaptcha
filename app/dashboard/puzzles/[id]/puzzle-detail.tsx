"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { cn, shuffle } from "@/lib/utils";
import { updatePuzzle, deletePuzzle } from "./actions";
import { CAPTCHA_MAX_CORRECT, CAPTCHA_GRID_SIZE, DIFFICULTY_PRESETS } from "@/lib/types";
import { CaptchaCheckbox } from "@/components/captcha/captcha-checkbox";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface PuzzleDetailProps {
  puzzle: {
    id: string;
    prompt: string;
    difficulty: number;
    correctImageIds: string[];
    incorrectImageIds: string[] | null;
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
        if (next.size >= CAPTCHA_MAX_CORRECT) return prev;
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

  const requiredCorrect = Math.ceil(correctIds.size * difficulty);
  const neededIncorrect = CAPTCHA_GRID_SIZE - correctIds.size;
  const incorrectSatisfied =
    !handPickIncorrect || incorrectIds.size >= neededIncorrect;

  const [previewKey, setPreviewKey] = useState(0);

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
        <input type="hidden" name="difficulty" value={difficulty} />

        {/* Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
            <CardDescription>
              Use <code>|</code> to separate instruction from keyword.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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

        {/* Correct Images */}
        <Card>
          <CardHeader>
            <CardTitle>
              Correct Images{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({correctIds.size}/{CAPTCHA_MAX_CORRECT})
              </span>
            </CardTitle>
            <CardDescription>
              Click images to toggle correct/incorrect. Max {CAPTCHA_MAX_CORRECT}.
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
            disabled={isPending || correctIds.size === 0 || !incorrectSatisfied}
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
        <div className="hidden w-[370px] shrink-0 lg:block">
          <div className="sticky top-6">
            {correctIds.size > 0 && incorrectSatisfied ? (
              <PuzzlePreview
                key={`${previewKey}-${Array.from(correctIds).sort().join()}-${Array.from(incorrectIds).sort().join()}-${handPickIncorrect}-${difficulty}`}
                prompt={prompt}
                images={images}
                correctIds={correctIds}
                incorrectIds={incorrectIds}
                handPickIncorrect={handPickIncorrect}
                difficulty={difficulty}
                onRefresh={() => setPreviewKey((k) => k + 1)}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-20">
                  <p className="text-sm text-muted-foreground">
                    Select correct images to see preview
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PuzzlePreview({
  prompt,
  images,
  correctIds,
  incorrectIds,
  handPickIncorrect,
  difficulty,
  onRefresh,
}: {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  difficulty: number;
  onRefresh: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "challenge" | "verified">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildGrid = () => {
    const correct = images.filter((img) => correctIds.has(img.id));
    let incorrect: typeof images;
    if (handPickIncorrect) {
      incorrect = images.filter((img) => incorrectIds.has(img.id));
    } else {
      incorrect = shuffle(images.filter((img) => !correctIds.has(img.id)));
    }
    const needed = CAPTCHA_GRID_SIZE - correct.length;
    return shuffle([...correct, ...incorrect.slice(0, needed)]);
  };

  const [previewImages, setPreviewImages] = useState(buildGrid);

  const reshuffleGrid = () => {
    setPreviewImages(buildGrid());
  };

  const handleRequestChallenge = () => {
    setPhase("loading");
    setErrorMessage(null);
    setTimeout(() => setPhase("challenge"), 500);
  };

  const handleVerify = (selectedIds: string[]) => {
    const correctCount = selectedIds.filter((id) => correctIds.has(id)).length;
    const requiredCount = Math.ceil(correctIds.size * difficulty);
    const allSelected = selectedIds.length === CAPTCHA_GRID_SIZE;
    const passed = !allSelected && correctCount >= requiredCount;

    if (passed) {
      setPhase("verified");
    } else {
      // Show error, reshuffle images but keep error message visible
      setErrorMessage("Please try again.");
      setPreviewImages(buildGrid());
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Preview</p>
      <p className="text-xs text-muted-foreground">
        Test how this puzzle works for users.
      </p>

      {phase === "idle" || phase === "loading" ? (
        <CaptchaCheckbox
          onRequestChallenge={handleRequestChallenge}
          state={phase}
        />
      ) : phase === "challenge" ? (
        <CaptchaWidget
          key={previewImages.map((i) => i.id).join()}
          prompt={prompt || "Select all images with|..."}
          images={previewImages.map((img) => ({ id: img.id, url: img.url }))}
          onVerify={handleVerify}
          onRefresh={() => {
            reshuffleGrid();
            onRefresh();
          }}
          errorMessage={errorMessage}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <CaptchaCheckbox
            onRequestChallenge={() => {}}
            state="verified"
          />
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              reshuffleGrid();
              onRefresh();
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Refresh preview
          </button>
        </div>
      )}
    </div>
  );
}
