"use client";

import { Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AudioTrimmer,
  type AudioTrimmerHandle,
} from "@/components/audio-trimmer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encodeWav } from "@/lib/wav";
import { uploadAudio } from "./actions";

const MAX_AUDIO_SEC = 10;
// 44.1kHz mono preserves the full audible spectrum (vs 22.05k cutting at
// 11kHz Nyquist, which made consonants and music sound muffled). A 10s
// clip is ~880KB.
const TARGET_SAMPLE_RATE = 44100;
const TARGET_CHANNELS = 1;

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

  const loadFile = useCallback(async (f: File) => {
    trimmerRef.current?.stopPlayback();
    setFile(f);

    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    const arrayBuf = await f.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    setAudioBuffer(decoded);
    setTrimStart(0);
    // Default the selected region to ≤ MAX_AUDIO_SEC so long uploads don't
    // start with an over-cap selection the user has to manually shrink.
    const initialEnd =
      decoded.duration > 0 ? Math.min(1, MAX_AUDIO_SEC / decoded.duration) : 1;
    setTrimEnd(initialEnd);
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      if (f) loadFile(f);
    },
    [loadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [] },
    multiple: false,
    noClick: !!audioBuffer,
    noKeyboard: !!audioBuffer,
  });

  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  const trimAndExport = useCallback(async (): Promise<{
    blob: Blob;
    durationMs: number;
  } | null> => {
    if (!audioBuffer) return null;

    // Clip selection length once at render time — the trimmer also enforces
    // this, but a defensive clamp keeps the upload honest.
    const selectedSec = Math.min(
      MAX_AUDIO_SEC,
      (trimEnd - trimStart) * audioBuffer.duration,
    );
    const length = Math.floor(selectedSec * TARGET_SAMPLE_RATE);
    const durationMs = Math.round(selectedSec * 1000);

    // Render mono at TARGET_SAMPLE_RATE: a 10s clip is ~880KB vs the
    // multi-MB source stereo, while keeping the full audible spectrum.
    const offline = new OfflineAudioContext(
      TARGET_CHANNELS,
      length,
      TARGET_SAMPLE_RATE,
    );
    const source = offline.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offline.destination);
    source.start(0, trimStart * audioBuffer.duration, selectedSec);

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
        </DialogHeader>
        <form action={formAction} className="flex min-w-0 flex-col gap-4">
          {!audioBuffer && (
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted-foreground/25 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="size-8" />
              <span className="text-sm">{t("upload.dropOrBrowse")}</span>
            </div>
          )}

          {audioBuffer && audioCtxRef.current && (
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 truncate">{file?.name}</span>
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
                maxDurationSec={MAX_AUDIO_SEC}
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
