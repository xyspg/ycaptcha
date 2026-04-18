"use client";

import { Grid3X3, Pause, Play, RotateCw } from "lucide-react";
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
      className="w-[350px] select-none overflow-hidden rounded border bg-white shadow-md"
      style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* Header */}
      <div className="bg-[#4285f4] px-4 py-[14px]">
        <p className="text-[14px] leading-snug text-white/90">
          Type what you hear
        </p>
        <p className="text-[18px] font-bold leading-tight text-white">
          Audio Challenge
        </p>
      </div>

      {/* Audio player */}
      <div className="relative flex flex-col items-center gap-4 px-6 py-8">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
            <RotateCw className="size-8 animate-spin text-[#4285f4]" />
          </div>
        )}

        {/* Hidden audio element */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- CAPTCHA audio has no captions by design */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Play button */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex size-16 items-center justify-center rounded-full bg-[#4285f4] text-white shadow-md transition-colors hover:bg-[#3367d6] active:bg-[#2a56c6]"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-7" />
          ) : (
            <Play className="ml-1 size-7" />
          )}
        </button>

        <p className="text-xs text-[#9b9b9b]">Press play to hear the audio</p>

        {/* Answer input */}
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer..."
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="w-full rounded border border-[#e0e0e0] px-3 py-2 text-[14px] outline-none focus:border-[#4285f4] focus:ring-1 focus:ring-[#4285f4]"
        />
      </div>

      {errorMessage && (
        <p className="py-2 text-center text-[13px] text-[#e53935]">
          {errorMessage}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#e0e0e0] bg-[#f9f9f9] px-2 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded p-2 text-[#9b9b9b] transition-colors hover:text-[#4285f4] disabled:opacity-40"
            aria-label="Get a new challenge"
          >
            <RotateCw className="size-[18px]" />
          </button>
          {onSwitchToImage && (
            <button
              type="button"
              onClick={onSwitchToImage}
              className="rounded p-2 text-[#9b9b9b] transition-colors hover:text-[#4285f4]"
              aria-label="Switch to image mode"
            >
              <Grid3X3 className="size-[18px]" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={answer.trim().length === 0 || loading}
          className={cn(
            "rounded-sm px-7 py-[9px] text-[14px] font-bold uppercase tracking-wide text-white transition-colors",
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
