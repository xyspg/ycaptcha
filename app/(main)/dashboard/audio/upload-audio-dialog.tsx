"use client";

import { Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useCallback, useRef, useState } from "react";
import {
  AudioTrimmer,
  type AudioTrimmerHandle,
} from "@/components/audio-trimmer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encodeWav } from "@/lib/wav";
import { uploadAudio } from "./actions";

export function UploadAudioDialog() {
  const t = useTranslations("audio");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const trimmerRef = useRef<AudioTrimmerHandle>(null);

  const reset = useCallback(() => {
    trimmerRef.current?.stopPlayback();
    setFile(null);
    setAudioBuffer(null);
    setTrimStart(0);
    setTrimEnd(1);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      trimmerRef.current?.stopPlayback();
      setFile(f);

      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      const arrayBuf = await f.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setAudioBuffer(decoded);
      setTrimStart(0);
      setTrimEnd(1);
    },
    [],
  );

  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  const trimAndExport = useCallback(async (): Promise<{
    blob: Blob;
    durationMs: number;
  } | null> => {
    if (!audioBuffer) return null;

    const length = Math.floor(
      (trimEnd - trimStart) * audioBuffer.duration * audioBuffer.sampleRate,
    );
    const durationMs = Math.round(
      (trimEnd - trimStart) * audioBuffer.duration * 1000,
    );

    const offline = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate,
    );
    const source = offline.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offline.destination);
    source.start(
      0,
      trimStart * audioBuffer.duration,
      (trimEnd - trimStart) * audioBuffer.duration,
    );

    const rendered = await offline.startRendering();
    return { blob: encodeWav(rendered), durationMs };
  }, [audioBuffer, trimStart, trimEnd]);

  const [state, formAction, isPending] = useActionState(
    async (
      prev: Awaited<ReturnType<typeof uploadAudio>>,
      formData: FormData,
    ) => {
      const trimmed = await trimAndExport();
      if (!trimmed) {
        return { errors: { file: ["No audio to upload"] } };
      }

      const fd = new FormData();
      fd.set(
        "file",
        new File([trimmed.blob], "audio.wav", { type: "audio/wav" }),
      );
      fd.set("name", formData.get("name") as string);
      fd.set("durationMs", String(trimmed.durationMs));

      const result = await uploadAudio(prev, fd);
      if (result?.success) {
        reset();
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> {t("uploadAudio")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("upload.title")}</DialogTitle>
          <DialogDescription>{t("upload.description")}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {!audioBuffer && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Upload className="size-8" />
              <span className="text-sm">{t("upload.dropOrBrowse")}</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {audioBuffer && audioCtxRef.current && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="truncate">{file?.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs underline"
                  onClick={reset}
                >
                  {t("upload.changeFile")}
                </button>
              </div>

              <AudioTrimmer
                ref={trimmerRef}
                audioBuffer={audioBuffer}
                audioContext={audioCtxRef.current}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={handleTrimChange}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="audio-name">{tc("name")}</Label>
            <Input
              id="audio-name"
              name="name"
              placeholder={t("upload.namePlaceholder")}
              required
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          {state?.errors?.file && (
            <p className="text-xs text-destructive">{state.errors.file[0]}</p>
          )}

          <Button
            variant="outline"
            type="submit"
            disabled={isPending || !audioBuffer}
          >
            {isPending ? tc("creating") : t("uploadAudio")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
