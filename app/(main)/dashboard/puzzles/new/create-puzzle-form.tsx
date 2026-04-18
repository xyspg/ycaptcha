"use client";

import { ArrowLeft } from "lucide-react";
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
import { createPuzzle } from "./actions";

interface ImageSetData {
  id: string;
  name: string;
  images: ImageData[];
}

interface AudioClipData {
  id: string;
  name: string;
  url: string;
}

interface CreatePuzzleFormProps {
  sites: { id: string; name: string }[];
  defaultSiteId?: string;
  imageSets: ImageSetData[];
  audioClips: AudioClipData[];
}

export function CreatePuzzleForm({
  sites,
  defaultSiteId,
  imageSets,
  audioClips,
}: CreatePuzzleFormProps) {
  const t = useTranslations("puzzles.create");
  const tp = useTranslations("puzzles");
  const tc = useTranslations("common");
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId ?? "");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [captchaMode, setCaptchaMode] = useState<CaptchaMode>("image");
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [audioAnswer, setAudioAnswer] = useState("");
  const config = usePuzzleConfig();

  const needsImages = captchaMode !== "audio";
  const needsAudio = captchaMode !== "image";

  const selectedSet = imageSets.find((s) => s.id === selectedSetId);
  const selectedAudio = audioClips.find((c) => c.id === selectedAudioId);

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
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: config panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <form action={formAction} className="flex flex-col gap-6">
            <input type="hidden" name="siteId" value={selectedSiteId} />
            <input type="hidden" name="imageSetId" value={selectedSetId} />
            <input type="hidden" name="captchaMode" value={captchaMode} />
            <input type="hidden" name="audioId" value={selectedAudioId} />
            <input type="hidden" name="audioAnswer" value={audioAnswer} />
            <PuzzleHiddenFields config={config} />

            {/* Site Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t("site")}</CardTitle>
                <CardDescription>{t("siteDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <NativeSelect
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                >
                  <option value="">{t("selectSite")}</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
                {sites.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("noSitesYet")}{" "}
                    <Link
                      href="/dashboard/sites"
                      className="underline hover:text-foreground"
                    >
                      {t("createOneFirst")}
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

            {/* Captcha Mode */}
            <Card>
              <CardHeader>
                <CardTitle>{t("captchaMode")}</CardTitle>
                <CardDescription>{t("captchaModeDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <NativeSelect
                  value={captchaMode}
                  onChange={(e) =>
                    setCaptchaMode(e.target.value as CaptchaMode)
                  }
                >
                  <option value="image">{t("modeImage")}</option>
                  <option value="audio">{t("modeAudio")}</option>
                  <option value="combined">{t("modeCombined")}</option>
                </NativeSelect>
              </CardContent>
            </Card>

            {/* Image Set Selection — shown for image/combined modes */}
            {needsImages && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("imageSet")}</CardTitle>
                  <CardDescription>
                    {t("imageSetDescription")}{" "}
                    <Link
                      href="/dashboard/image-sets"
                      className="underline hover:text-foreground"
                    >
                      {tc("manage")}
                    </Link>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NativeSelect
                    name="imageSetId"
                    value={selectedSetId}
                    onChange={(e) => handleSetChange(e.target.value)}
                  >
                    <option value="">{t("selectImageSet")}</option>
                    {imageSets.map((is) => (
                      <option key={is.id} value={is.id}>
                        {t("imageSetOption", {
                          name: is.name,
                          count: is.images.length,
                        })}
                      </option>
                    ))}
                  </NativeSelect>
                  {imageSets.length === 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("noImageSetsYet")}{" "}
                      <Link
                        href="/dashboard/image-sets"
                        className="underline hover:text-foreground"
                      >
                        {t("createOneFirst")}
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
            )}

            {needsImages && (
              <PromptField config={config} errors={state?.errors?.prompt} />
            )}

            {needsImages && selectedSet && (
              <CorrectImageGrid
                images={selectedSet.images}
                config={config}
                errors={state?.errors?.correctImageIds}
              />
            )}

            {needsImages && (
              <AdvancedSettings
                images={selectedSet?.images ?? []}
                config={config}
                errors={state?.errors}
              />
            )}

            {/* Audio config — shown for audio/combined modes */}
            {needsAudio && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("audioCaptcha")}</CardTitle>
                  <CardDescription>
                    {t("audioCaptchaDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>{t("selectAudio")}</Label>
                    <NativeSelect
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                    >
                      <option value="">{t("selectAudioPlaceholder")}</option>
                      {audioClips.map((clip) => (
                        <option key={clip.id} value={clip.id}>
                          {clip.name}
                        </option>
                      ))}
                    </NativeSelect>
                    {audioClips.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t("noAudioYet")}{" "}
                        <Link
                          href="/dashboard/audio"
                          className="underline hover:text-foreground"
                        >
                          {t("uploadFirst")}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="audioAnswer">{t("audioAnswerLabel")}</Label>
                    <Input
                      id="audioAnswer"
                      value={audioAnswer}
                      onChange={(e) => setAudioAnswer(e.target.value)}
                      placeholder={t("audioAnswerPlaceholder")}
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("audioAnswerHint")}
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

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  (needsImages &&
                    (config.correctIds.size === 0 || !selectedSetId)) ||
                  (needsAudio && (!selectedAudioId || !audioAnswer.trim())) ||
                  !selectedSiteId
                }
              >
                {isPending ? tc("creating") : tp("createPuzzle")}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/dashboard/puzzles">{tc("cancel")}</Link>
              </Button>
            </div>
          </form>
        </div>

        {/* Right: sticky preview */}
        <PuzzlePreviewSidebar
          images={selectedSet?.images ?? []}
          config={config}
          captchaMode={captchaMode}
          audioUrl={selectedAudio?.url}
          audioAnswer={audioAnswer}
        />
      </div>
    </div>
  );
}
