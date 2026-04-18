"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import { deleteAudio, updateAudio } from "../actions";

interface AudioDetailProps {
  audio: {
    id: string;
    name: string;
    url: string;
    durationMs: number | null;
  };
}

export function AudioDetail({ audio }: AudioDetailProps) {
  const t = useTranslations("audio");
  const tc = useTranslations("common");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateAudio,
    null,
  );

  const handleDelete = async () => {
    const fd = new FormData();
    fd.set("audioId", audio.id);
    await deleteAudio(null, fd);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/audio">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{audio.name}</h1>
      </div>

      {/* Audio player */}
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.playback")}</CardTitle>
        </CardHeader>
        <CardContent>
          <audio
            controls
            className="w-full"
            src={audio.url}
            preload="metadata"
          />
        </CardContent>
      </Card>

      {/* Edit name */}
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.settings")}</CardTitle>
          <CardDescription>{t("detail.settingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="flex flex-col gap-4">
            <input type="hidden" name="audioId" value={audio.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{tc("name")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={audio.name}
                required
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
              {updateState?.errors?.name && (
                <p className="text-xs text-destructive">
                  {updateState.errors.name[0]}
                </p>
              )}
            </div>
            {updateState?.success && (
              <p className="text-xs text-green-600">{updateState.message}</p>
            )}
            <Button type="submit" variant="outline" disabled={isUpdating}>
              {isUpdating ? tc("saving") : tc("saveChanges")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("detail.dangerZone")}
          </CardTitle>
          <CardDescription>{t("detail.dangerDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t("deleteAudio")}
          </Button>
          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={t("deleteAudio")}
            description={t("deleteAudioDescription")}
            onConfirm={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
