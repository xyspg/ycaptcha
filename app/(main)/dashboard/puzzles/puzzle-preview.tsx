"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CaptchaAudioWidget } from "@/components/captcha/captcha-audio-widget";
import { CaptchaCheckbox } from "@/components/captcha/captcha-checkbox";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
import { Card, CardContent } from "@/components/ui/card";
import { CAPTCHA_GRID_SIZE, type CaptchaMode } from "@/lib/types";
import { shuffle } from "@/lib/utils";

interface PuzzlePreviewProps {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  correctCount: number;
  difficulty: number;
  captchaMode: CaptchaMode;
  audioUrl?: string;
  audioAnswer?: string;
}

type Phase = "idle" | "loading" | "challenge" | "verified";
type WidgetView = "image" | "audio";

export function PuzzlePreview({
  prompt,
  images,
  correctIds,
  incorrectIds,
  handPickIncorrect,
  correctCount,
  difficulty,
  captchaMode,
  audioUrl,
  audioAnswer,
}: PuzzlePreviewProps) {
  const t = useTranslations("puzzlePreview");
  const [phase, setPhase] = useState<Phase>("idle");
  const [view, setView] = useState<WidgetView>(
    captchaMode === "audio" ? "audio" : "image",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const needsAudio = captchaMode !== "image";
  const audioReady = !!audioUrl && !!audioAnswer?.trim();

  const buildGrid = () => {
    const allCorrect = images.filter((img) => correctIds.has(img.id));
    const selectedCorrect = shuffle(allCorrect).slice(0, correctCount);
    const selectedCorrectIds = new Set(selectedCorrect.map((img) => img.id));

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
    setView(captchaMode === "audio" ? "audio" : "image");
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

  const handleAudioVerify = (textAnswer: string) => {
    if (!audioAnswer) return;
    if (textAnswer.toLowerCase() === audioAnswer.trim().toLowerCase()) {
      setPhase("verified");
    } else {
      setErrorMessage("Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="text-xs text-muted-foreground">{t("description")}</p>

      {phase === "idle" || phase === "loading" ? (
        <CaptchaCheckbox
          onRequestChallenge={handleRequestChallenge}
          state={phase}
        />
      ) : phase === "challenge" ? (
        view === "audio" && audioReady ? (
          <CaptchaAudioWidget
            audioUrl={audioUrl!}
            onVerify={handleAudioVerify}
            onRefresh={() => setErrorMessage(null)}
            onSwitchToImage={
              captchaMode === "combined" ? () => setView("image") : undefined
            }
            errorMessage={errorMessage}
          />
        ) : (
          <CaptchaWidget
            key={preview.grid.map((i) => i.id).join()}
            prompt={prompt || "..."}
            images={preview.grid.map((img) => ({ url: img.url }))}
            onVerify={handleVerify}
            onRefresh={reshuffleGrid}
            audioEnabled={needsAudio && audioReady}
            onSwitchToAudio={
              needsAudio && audioReady ? () => setView("audio") : undefined
            }
            errorMessage={errorMessage}
          />
        )
      ) : (
        <div className="flex w-fit flex-col items-center gap-2">
          <CaptchaCheckbox onRequestChallenge={() => {}} state="verified" />
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setErrorMessage(null);
              reshuffleGrid();
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("refreshPreview")}
          </button>
        </div>
      )}
    </div>
  );
}

interface PuzzlePreviewPanelProps {
  prompt: string;
  images: { id: string; url: string; name: string | null }[];
  correctIds: Set<string>;
  incorrectIds: Set<string>;
  handPickIncorrect: boolean;
  correctCount: number;
  difficulty: number;
  captchaMode: CaptchaMode;
  audioUrl?: string;
  audioAnswer?: string;
}

export function PuzzlePreviewPanel({
  prompt,
  images,
  correctIds,
  incorrectIds,
  handPickIncorrect,
  correctCount,
  difficulty,
  captchaMode,
  audioUrl,
  audioAnswer,
}: PuzzlePreviewPanelProps) {
  const t = useTranslations("puzzlePreview");
  const previewKey = useMemo(
    () =>
      `${captchaMode}-${[...correctIds].sort().join()}-${[...incorrectIds].sort().join()}-${handPickIncorrect}-${correctCount}-${difficulty}-${audioUrl ?? ""}-${audioAnswer ?? ""}`,
    [
      captchaMode,
      correctIds,
      incorrectIds,
      handPickIncorrect,
      correctCount,
      difficulty,
      audioUrl,
      audioAnswer,
    ],
  );

  const needsImages = captchaMode !== "audio";
  const needsAudio = captchaMode !== "image";
  const imagesReady = !needsImages || correctIds.size > 0;
  const audioReady = !needsAudio || (!!audioUrl && !!audioAnswer?.trim());
  const ready = imagesReady && audioReady;

  const placeholder = !needsImages
    ? t("selectAudioClip")
    : t("selectCorrectImages");

  return (
    <div className="hidden w-[370px] shrink-0 lg:block">
      <div className="sticky top-6">
        {ready ? (
          <PuzzlePreview
            key={previewKey}
            prompt={prompt}
            images={images}
            correctIds={correctIds}
            incorrectIds={incorrectIds}
            handPickIncorrect={handPickIncorrect}
            correctCount={correctCount}
            difficulty={difficulty}
            captchaMode={captchaMode}
            audioUrl={audioUrl}
            audioAnswer={audioAnswer}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">{placeholder}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
