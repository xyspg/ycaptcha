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
  const t = useTranslations("puzzles.create");
  const tp = useTranslations("puzzles");
  const tc = useTranslations("common");
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
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
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
                <CardTitle>{t("site")}</CardTitle>
                <CardDescription>{t("siteDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("selectSite")}</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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

            {/* Image Set Selection */}
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
                <select
                  name="imageSetId"
                  value={selectedSetId}
                  onChange={(e) => handleSetChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                </select>
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
        />
      </div>
    </div>
  );
}
