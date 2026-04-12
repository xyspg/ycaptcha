"use client";

import { useMemo, useState } from "react";
import { CaptchaCheckbox } from "@/components/captcha/captcha-checkbox";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
import { Card, CardContent } from "@/components/ui/card";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";
import { shuffle } from "@/lib/utils";

interface PuzzlePreviewProps {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  correctCount: number;
  difficulty: number;
}

export function PuzzlePreview({
  prompt,
  images,
  correctIds,
  incorrectIds,
  handPickIncorrect,
  correctCount,
  difficulty,
}: PuzzlePreviewProps) {
  const [phase, setPhase] = useState<
    "idle" | "loading" | "challenge" | "verified"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildGrid = () => {
    // Pick `correctCount` random correct images
    const allCorrect = images.filter((img) => correctIds.has(img.id));
    const selectedCorrect = shuffle(allCorrect).slice(0, correctCount);
    const selectedCorrectIds = new Set(selectedCorrect.map((img) => img.id));

    // Fill remaining with incorrect images
    let incorrect: typeof images;
    if (handPickIncorrect) {
      incorrect = shuffle(images.filter((img) => incorrectIds.has(img.id)));
    } else {
      incorrect = shuffle(images.filter((img) => !correctIds.has(img.id)));
    }
    const needed = CAPTCHA_GRID_SIZE - selectedCorrect.length;
    return {
      grid: shuffle([...selectedCorrect, ...incorrect.slice(0, needed)]),
      shownCorrectIds: selectedCorrectIds,
    };
  };

  const [preview, setPreview] = useState(buildGrid);

  const reshuffleGrid = () => {
    setPreview(buildGrid());
  };

  const handleRequestChallenge = () => {
    setPhase("loading");
    setErrorMessage(null);
    setTimeout(() => setPhase("challenge"), 500);
  };

  const handleVerify = (selectedIndices: number[]) => {
    const selectedImageIds = selectedIndices.map((i) => preview.grid[i].id);
    const selectedCorrectCount = selectedImageIds.filter((id) =>
      preview.shownCorrectIds.has(id),
    ).length;
    const requiredCount = Math.ceil(correctCount * difficulty);
    const allSelected = selectedIndices.length === CAPTCHA_GRID_SIZE;
    const passed = !allSelected && selectedCorrectCount >= requiredCount;

    if (passed) {
      setPhase("verified");
    } else {
      setErrorMessage("Please try again.");
      setPreview(buildGrid());
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
          key={preview.grid.map((i) => i.id).join()}
          prompt={prompt || "..."}
          images={preview.grid.map((img) => ({ url: img.url }))}
          onVerify={handleVerify}
          onRefresh={reshuffleGrid}
          errorMessage={errorMessage}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <CaptchaCheckbox onRequestChallenge={() => {}} state="verified" />
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              reshuffleGrid();
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

export function PuzzlePreviewPanel({
  prompt,
  images,
  correctIds,
  incorrectIds,
  handPickIncorrect,
  correctCount,
  difficulty,
}: {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  correctCount: number;
  difficulty: number;
}) {
  const previewKey = useMemo(
    () =>
      `${[...correctIds].sort().join()}-${[...incorrectIds].sort().join()}-${handPickIncorrect}-${correctCount}-${difficulty}`,
    [correctIds, incorrectIds, handPickIncorrect, correctCount, difficulty],
  );

  return (
    <div className="hidden w-[370px] shrink-0 lg:block">
      <div className="sticky top-6">
        {correctIds.size > 0 ? (
          <PuzzlePreview
            key={previewKey}
            prompt={prompt}
            images={images}
            correctIds={correctIds}
            incorrectIds={incorrectIds}
            handPickIncorrect={handPickIncorrect}
            correctCount={correctCount}
            difficulty={difficulty}
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
  );
}
