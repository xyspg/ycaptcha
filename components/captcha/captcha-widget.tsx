"use client";

import { Check, Headphones, RotateCw } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface CaptchaImage {
  url: string;
}

interface CaptchaWidgetProps {
  prompt: string;
  images: CaptchaImage[];
  onVerify: (selectedIndices: number[]) => void;
  onRefresh: () => void;
  onSwitchToAudio?: () => void;
  audioEnabled?: boolean;
  loading?: boolean;
  errorMessage?: string | null;
}

export function CaptchaWidget({
  prompt,
  images,
  onVerify,
  onRefresh,
  onSwitchToAudio,
  audioEnabled,
  loading,
  errorMessage,
}: CaptchaWidgetProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleVerify = () => {
    if (selected.size === 0) return;
    onVerify(Array.from(selected));
    setSelected(new Set());
  };

  const handleRefresh = () => {
    setSelected(new Set());
    onRefresh();
  };

  return (
    <div
      className="w-[350px] select-none overflow-hidden rounded border bg-white shadow-md"
      style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* Header */}
      <div className="bg-[#4285f4] px-4 py-[14px]">
        <p className="text-[14px] leading-snug text-white/90">
          Select all images with
        </p>
        <p className="text-[24px] font-bold leading-tight text-white">
          {prompt}
        </p>
      </div>

      {/* Image grid */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
            <RotateCw className="size-8 animate-spin text-[#4285f4]" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-px bg-[#e0e0e0]">
          {images.map((img, index) => {
            const isSelected = selected.has(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleSelect(index)}
                className="relative aspect-square cursor-pointer overflow-hidden bg-white outline-none"
              >
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  className={cn(
                    "pointer-events-none h-full w-full object-cover transition-transform duration-200 ease-out",
                    isSelected && "scale-[0.8] rounded-sm",
                  )}
                />
                {isSelected && (
                  <div className="absolute top-0.5 left-0.5 flex size-[26px] items-center justify-center rounded-full bg-[#4285f4] shadow">
                    <Check className="size-4 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
            onClick={handleRefresh}
            disabled={loading}
            className="rounded p-2 text-[#9b9b9b] transition-colors hover:text-[#4285f4] disabled:opacity-40"
            aria-label="Get a new challenge"
          >
            <RotateCw className="size-[18px]" />
          </button>
          {audioEnabled && (
            <button
              type="button"
              onClick={onSwitchToAudio}
              disabled={!onSwitchToAudio}
              className="rounded p-2 text-[#9b9b9b] transition-colors hover:text-[#4285f4] disabled:opacity-40"
              aria-label="Switch to audio challenge"
            >
              <Headphones className="size-[18px]" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={selected.size === 0 || loading}
          className={cn(
            "rounded-sm px-7 py-[9px] text-[14px] font-bold uppercase tracking-wide text-white transition-colors",
            selected.size === 0 || loading
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
