"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { CaptchaMode } from "@/lib/types";
import { deletePuzzle, updatePuzzle } from "./actions";

interface AudioClipData {
  id: string;
  name: string;
}

interface PuzzleDetailProps {
  puzzle: {
    id: string;
    prompt: string;
    difficulty: number;
    correctImageIds: string[];
    incorrectImageIds: string[] | null;
    correctCount: number;
    correctCountMax: number | null;
    imageSetId: string | null;
    audioId: string | null;
    audioAnswer: string | null;
    captchaMode: CaptchaMode;
  };
  siteName: string;
  images: ImageData[];
  audioClips: AudioClipData[];
}

export function PuzzleDetail({
  puzzle: p,
  siteName,
  images,
  audioClips,
}: PuzzleDetailProps) {
  const t = useTranslations("puzzles.edit");
  const tc = useTranslations("puzzles.create");
  const tp = useTranslations("puzzles");
  const tCommon = useTranslations("common");
  const [captchaMode, setCaptchaMode] = useState<CaptchaMode>(p.captchaMode);
  const [selectedAudioId, setSelectedAudioId] = useState(p.audioId ?? "");
  const [audioAnswer, setAudioAnswer] = useState(p.audioAnswer ?? "");
  const config = usePuzzleConfig({
    prompt: p.prompt,
    correctImageIds: p.correctImageIds,
    incorrectImageIds: p.incorrectImageIds,
    correctCount: p.correctCount,
    correctCountMax: p.correctCountMax,
    difficulty: p.difficulty,
  });

  const needsImages = captchaMode !== "audio";
  const needsAudio = captchaMode !== "image";

  const [state, formAction, isPending] = useActionState(updatePuzzle, null);
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deletePuzzle,
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/puzzles">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{siteName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: config panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <form action={formAction} className="flex flex-col gap-6">
            <input type="hidden" name="puzzleId" value={p.id} />
            <input type="hidden" name="captchaMode" value={captchaMode} />
            <input type="hidden" name="audioId" value={selectedAudioId} />
            <input type="hidden" name="audioAnswer" value={audioAnswer} />
            <PuzzleHiddenFields config={config} />

            {/* Captcha Mode */}
            <Card>
              <CardHeader>
                <CardTitle>{tc("captchaMode")}</CardTitle>
                <CardDescription>
                  {tc("captchaModeDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NativeSelect
                  value={captchaMode}
                  onChange={(e) =>
                    setCaptchaMode(e.target.value as CaptchaMode)
                  }
                >
                  <option value="image">{tc("modeImage")}</option>
                  <option value="audio">{tc("modeAudio")}</option>
                  <option value="combined">{tc("modeCombined")}</option>
                </NativeSelect>
              </CardContent>
            </Card>

            {needsImages && (
              <PromptField config={config} errors={state?.errors?.prompt} />
            )}

            {needsImages && (
              <CorrectImageGrid
                images={images}
                config={config}
                errors={state?.errors?.correctImageIds}
              />
            )}

            {needsImages && (
              <AdvancedSettings
                images={images}
                config={config}
                errors={state?.errors}
              />
            )}

            {/* Audio config */}
            {needsAudio && (
              <Card>
                <CardHeader>
                  <CardTitle>{tc("audioCaptcha")}</CardTitle>
                  <CardDescription>
                    {tc("audioCaptchaDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>{tc("selectAudio")}</Label>
                    <NativeSelect
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                    >
                      <option value="">{tc("selectAudioPlaceholder")}</option>
                      {audioClips.map((clip) => (
                        <option key={clip.id} value={clip.id}>
                          {clip.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="audioAnswer">
                      {tc("audioAnswerLabel")}
                    </Label>
                    <Input
                      id="audioAnswer"
                      value={audioAnswer}
                      onChange={(e) => setAudioAnswer(e.target.value)}
                      placeholder={tc("audioAnswerPlaceholder")}
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <p className="text-xs text-muted-foreground">
                      {tc("audioAnswerHint")}
                    </p>
                    {state?.errors?.audioAnswer && (
                      <p className="text-xs text-destructive">
                        {state.errors.audioAnswer[0]}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save */}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  (needsImages && config.correctIds.size === 0) ||
                  (needsAudio && (!selectedAudioId || !audioAnswer.trim()))
                }
              >
                {isPending ? tCommon("saving") : tCommon("saveChanges")}
              </Button>
              {state?.success && (
                <p className="text-xs text-muted-foreground">{state.message}</p>
              )}
            </div>
          </form>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">
                {t("dangerZone")}
              </CardTitle>
              <CardDescription>{t("dangerDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteAction}>
                <input type="hidden" name="puzzleId" value={p.id} />
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="size-3" />
                  {isDeleting ? tCommon("deleting") : tp("deletePuzzle")}
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
        {needsImages && (
          <PuzzlePreviewSidebar
            images={images}
            config={config}
            audioEnabled={needsAudio && !!selectedAudioId}
          />
        )}
      </div>
    </div>
  );
}
