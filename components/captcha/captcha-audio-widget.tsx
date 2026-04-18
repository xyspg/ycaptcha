"use client";

import { Download, Grid3X3, Info, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CaptchaAudioWidgetProps {
  audioUrl: string;
  onVerify: (textAnswer: string) => void;
  onSwitchToImage?: () => void;
  onRefresh: () => void;
  loading?: boolean;
  errorMessage?: string | null;
}

export function CaptchaAudioWidget({
  audioUrl,
  onVerify,
  onSwitchToImage,
  onRefresh,
  loading,
  errorMessage,
}: CaptchaAudioWidgetProps) {
  const [answer, setAnswer] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.currentTime = 0;
      el.play();
    }
  };

  const handleVerify = () => {
    if (answer.trim().length === 0) return;
    onVerify(answer.trim());
    setAnswer("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVerify();
    }
  };

  return (
    <div
      className="w-[280px] select-none overflow-hidden rounded border bg-white shadow-md"
      style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* Body */}
      <div className="relative flex flex-col gap-2.5 px-4 pt-4 pb-3">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
            <RotateCw className="size-6 animate-spin text-[#4285f4]" />
          </div>
        )}

        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- CAPTCHA audio has no captions by design */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        <p className="text-[13px] font-medium text-[#212121]">
          Press PLAY to listen
        </p>

        <button
          type="button"
          onClick={togglePlay}
          className="w-full rounded-sm bg-[#dadada] py-2.5 text-[13px] font-bold tracking-wide text-[#212121] transition-colors hover:bg-[#cfcfcf] active:bg-[#bfbfbf]"
        >
          {isPlaying ? "PAUSE" : "PLAY"}
        </button>

        <p className="text-[13px] font-medium text-[#212121]">
          Enter what you hear
        </p>

        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="w-full rounded-sm border border-[#9b9b9b] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#4285f4] focus:ring-1 focus:ring-[#4285f4]"
        />

        <a
          href={audioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mt-0.5 rounded p-1 text-[#616161] transition-colors hover:text-[#4285f4]"
          aria-label="Open audio in new tab"
        >
          <Download className="size-5" strokeWidth={2.25} />
        </a>
      </div>

      {errorMessage && (
        <p className="px-4 pb-2 text-center text-[12px] text-[#e53935]">
          {errorMessage}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e0e0e0] bg-white px-2 py-1.5">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded p-1.5 text-[#9b9b9b] transition-colors hover:text-[#4285f4] disabled:opacity-40"
            aria-label="Get a new challenge"
          >
            <RotateCw className="size-[16px]" />
          </button>
          {onSwitchToImage && (
            <button
              type="button"
              onClick={onSwitchToImage}
              className="rounded p-1.5 text-[#9b9b9b] transition-colors hover:text-[#4285f4]"
              aria-label="Switch to image challenge"
            >
              <Grid3X3 className="size-[16px]" />
            </button>
          )}
          <button
            type="button"
            className="rounded p-1.5 text-[#9b9b9b] transition-colors hover:text-[#4285f4]"
            aria-label="About this challenge"
          >
            <Info className="size-[16px]" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={answer.trim().length === 0 || loading}
          className={cn(
            "rounded-sm px-5 py-[7px] text-[12px] font-bold uppercase tracking-wide text-white transition-colors",
            answer.trim().length === 0 || loading
              ? "cursor-not-allowed bg-[#4285f4]/40"
              : "bg-[#4285f4] shadow-sm hover:bg-[#3367d6] active:bg-[#2a56c6]",
          )}
        >
          Verify
        </button>
      </div>
    </div>
  );
}
