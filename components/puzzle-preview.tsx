"use client";

import { useMemo, useState } from "react";
import { shuffle } from "@/lib/utils";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";
import { CaptchaCheckbox } from "@/components/captcha/captcha-checkbox";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
import { Card, CardContent } from "@/components/ui/card";

interface PuzzlePreviewProps {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  difficulty: number;
}

export function PuzzlePreview({
  prompt,
  images,
  correctIds,
  incorrectIds,
  handPickIncorrect,
  difficulty,
}: PuzzlePreviewProps) {
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
          prompt={prompt || "..."}
          images={previewImages.map((img) => ({ id: img.id, url: img.url }))}
          onVerify={handleVerify}
          onRefresh={reshuffleGrid}
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
  difficulty,
  incorrectSatisfied,
}: {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  difficulty: number;
  incorrectSatisfied: boolean;
}) {
  const previewKey = useMemo(
    () =>
      `${[...correctIds].sort().join()}-${[...incorrectIds].sort().join()}-${handPickIncorrect}-${difficulty}`,
    [correctIds, incorrectIds, handPickIncorrect, difficulty],
  );

  return (
    <div className="hidden w-[370px] shrink-0 lg:block">
      <div className="sticky top-6">
        {correctIds.size > 0 && incorrectSatisfied ? (
          <PuzzlePreview
            key={previewKey}
            prompt={prompt}
            images={images}
            correctIds={correctIds}
            incorrectIds={incorrectIds}
            handPickIncorrect={handPickIncorrect}
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
