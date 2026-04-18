"use client";

import { Pause, Play } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface AudioTrimmerProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
  /** 0–1 normalized */
  trimStart: number;
  /** 0–1 normalized */
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  /** Hard cap on the selected region length, in seconds. */
  maxDurationSec?: number;
}

export interface AudioTrimmerHandle {
  stopPlayback: () => void;
}

const MIN_GAP = 0.01;
const HANDLE_HIT_PX = 12;
const HANDLE_COLOR = "hsl(217, 91%, 60%)"; // blue-500
const WAVEFORM_COLOR = "hsl(215, 16%, 47%)"; // muted

type DragTarget = "start" | "end" | "region" | null;

export const AudioTrimmer = forwardRef<AudioTrimmerHandle, AudioTrimmerProps>(
  function AudioTrimmer(
    {
      audioBuffer,
      audioContext,
      trimStart,
      trimEnd,
      onTrimChange,
      maxDurationSec,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);
    const waveformCacheRef = useRef<ImageBitmap | null>(null);
    const prevSizeRef = useRef({ w: 0, h: 0 });

    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const playStartTimeRef = useRef(0);
    const playStartPosRef = useRef(0);
    const rafRef = useRef(0);

    const dragRef = useRef<{
      target: DragTarget;
      originX: number;
      startAtDown: number;
      endAtDown: number;
    } | null>(null);

    const stopPlayback = useCallback(() => {
      cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          // already stopped
        }
        sourceRef.current = null;
      }
      setIsPlaying(false);
      if (playheadRef.current) {
        playheadRef.current.style.opacity = "0";
      }
    }, []);

    useImperativeHandle(ref, () => ({ stopPlayback }), [stopPlayback]);

    const buildWaveformBitmap = useCallback(
      (w: number, h: number) => {
        const off = new OffscreenCanvas(w, h);
        const ctx = off.getContext("2d")!;
        const data = audioBuffer.getChannelData(0);
        const len = data.length;
        const mid = h / 2;

        ctx.fillStyle = WAVEFORM_COLOR;
        for (let i = 0; i < w; i++) {
          const sampleStart = Math.floor((i / w) * len);
          const sampleEnd = Math.min(len, Math.floor(((i + 1) / w) * len));
          let min = 0;
          let max = 0;
          for (let j = sampleStart; j < sampleEnd; j++) {
            if (data[j] < min) min = data[j];
            if (data[j] > max) max = data[j];
          }
          const top = mid - max * mid;
          const bot = mid - min * mid;
          const barH = Math.max(1, bot - top);
          ctx.fillRect(i, top, 1, barH);
        }

        return off.transferToImageBitmap();
      },
      [audioBuffer],
    );

    /**
     * Paint waveform + selection + handles. Does NOT draw the playhead — that
     * lives in a sibling DOM element so the 60fps RAF loop can update via
     * `transform` only, not redraw the entire canvas.
     */
    const paint = useCallback(
      (s: number, e: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const pxW = Math.round(cssW * dpr);
        const pxH = Math.round(cssH * dpr);

        if (canvas.width !== pxW || canvas.height !== pxH) {
          canvas.width = pxW;
          canvas.height = pxH;
          waveformCacheRef.current = null;
        }

        if (
          !waveformCacheRef.current ||
          prevSizeRef.current.w !== cssW ||
          prevSizeRef.current.h !== cssH
        ) {
          waveformCacheRef.current = buildWaveformBitmap(cssW, cssH);
          prevSizeRef.current = { w: cssW, h: cssH };
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const sPx = Math.round(s * cssW);
        const ePx = Math.round(e * cssW);

        ctx.globalAlpha = 0.25;
        ctx.drawImage(waveformCacheRef.current, 0, 0, cssW, cssH);
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.beginPath();
        ctx.rect(sPx, 0, ePx - sPx, cssH);
        ctx.clip();
        ctx.drawImage(waveformCacheRef.current, 0, 0, cssW, cssH);
        ctx.restore();

        ctx.strokeStyle = HANDLE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sPx + 0.5, 0.5, ePx - sPx - 1, cssH - 1);

        const handleW = 6;
        const handleH = 28;
        const handleR = 3;
        const handleY = (cssH - handleH) / 2;

        for (const px of [sPx, ePx]) {
          const hx = px - handleW / 2;
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          roundRect(ctx, hx + 1, handleY + 1, handleW, handleH, handleR);
          ctx.fill();
          ctx.fillStyle = HANDLE_COLOR;
          roundRect(ctx, hx, handleY, handleW, handleH, handleR);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, handleY + 8);
          ctx.lineTo(px, handleY + handleH - 8);
          ctx.stroke();
        }
      },
      [buildWaveformBitmap],
    );

    const canvasCallbackRef = useCallback(
      (node: HTMLCanvasElement | null) => {
        (
          canvasRef as React.MutableRefObject<HTMLCanvasElement | null>
        ).current = node;
        if (node) {
          requestAnimationFrame(() => paint(trimStart, trimEnd));
        }
      },
      [paint, trimStart, trimEnd],
    );

    const movePlayhead = useCallback((normPos: number | null) => {
      const el = playheadRef.current;
      if (!el) return;
      if (normPos === null) {
        el.style.opacity = "0";
        return;
      }
      // translateX with `%` resolves to the element's own width (2px), not
      // the parent's. Measure the canvas instead.
      const widthPx = canvasRef.current?.clientWidth ?? 0;
      el.style.opacity = "1";
      el.style.transform = `translateX(${normPos * widthPx}px)`;
    }, []);

    const animatePlayhead = useCallback(() => {
      if (!sourceRef.current) return;
      const elapsed = audioContext.currentTime - playStartTimeRef.current;
      const posSec = playStartPosRef.current + elapsed;
      const posNorm = posSec / audioBuffer.duration;

      if (posNorm >= trimEnd) {
        stopPlayback();
        return;
      }

      movePlayhead(posNorm);
      rafRef.current = requestAnimationFrame(animatePlayhead);
    }, [audioBuffer, audioContext, trimEnd, movePlayhead, stopPlayback]);

    const togglePlay = useCallback(() => {
      // Gate on the synchronous ref, not React state — rapid clicks (Space +
      // mouse) can fire before `setIsPlaying(true)` flushes, which would
      // otherwise spawn a second source and orphan the first.
      if (sourceRef.current) {
        stopPlayback();
        return;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const startSec = trimStart * audioBuffer.duration;
      const durSec = (trimEnd - trimStart) * audioBuffer.duration;
      source.start(0, startSec, durSec);
      source.onended = () => {
        // Only clean up if this source is still the active one — a
        // stop-then-replay can install a new source before our onended fires.
        if (sourceRef.current !== source) return;
        sourceRef.current = null;
        setIsPlaying(false);
        cancelAnimationFrame(rafRef.current);
        movePlayhead(null);
      };

      sourceRef.current = source;
      playStartTimeRef.current = audioContext.currentTime;
      playStartPosRef.current = startSec;
      setIsPlaying(true);
      movePlayhead(trimStart);
      rafRef.current = requestAnimationFrame(animatePlayhead);
    }, [
      audioBuffer,
      audioContext,
      trimStart,
      trimEnd,
      stopPlayback,
      animatePlayhead,
      movePlayhead,
    ]);

    const getX = (e: React.PointerEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    };

    const hitTest = (xNorm: number): DragTarget => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const w = canvas.clientWidth;
      const xPx = xNorm * w;
      const sPx = trimStart * w;
      const ePx = trimEnd * w;
      const regionPx = ePx - sPx;

      // Handles always own ±HANDLE_HIT_PX *outside* the region so they're
      // easy to grab. *Inside* the region they're capped to a third of the
      // region width so a tiny window still leaves a center strip for
      // region-drag (long source + short cap → narrow region).
      const innerHit = Math.min(HANDLE_HIT_PX, regionPx / 3);

      if (xPx < sPx && xPx >= sPx - HANDLE_HIT_PX) return "start";
      if (xPx > ePx && xPx <= ePx + HANDLE_HIT_PX) return "end";
      if (xPx >= sPx && xPx < sPx + innerHit) return "start";
      if (xPx <= ePx && xPx > ePx - innerHit) return "end";
      if (xPx >= sPx + innerHit && xPx <= ePx - innerHit) return "region";
      return null;
    };

    const cursorFor = (target: DragTarget) =>
      target === "start" || target === "end"
        ? "ew-resize"
        : target === "region"
          ? "grab"
          : "default";

    const onPointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const x = getX(e);
      const target = hitTest(x);
      if (!target) return;

      // Any trim change invalidates what the user is hearing.
      stopPlayback();

      canvas.setPointerCapture(e.pointerId);
      dragRef.current = {
        target,
        originX: x,
        startAtDown: trimStart,
        endAtDown: trimEnd,
      };
      canvas.style.cursor =
        target === "region" ? "grabbing" : cursorFor(target);
    };

    const onPointerMove = (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const x = getX(e);

      if (!dragRef.current) {
        const next = cursorFor(hitTest(x));
        if (canvas.style.cursor !== next) canvas.style.cursor = next;
        return;
      }

      const { target, originX, startAtDown, endAtDown } = dragRef.current;
      const delta = x - originX;
      let newStart = trimStart;
      let newEnd = trimEnd;

      const maxGap =
        maxDurationSec && audioBuffer.duration > 0
          ? Math.min(1, maxDurationSec / audioBuffer.duration)
          : 1;

      if (target === "start") {
        newStart = Math.max(
          Math.max(0, trimEnd - maxGap),
          Math.min(trimEnd - MIN_GAP, startAtDown + delta),
        );
      } else if (target === "end") {
        newEnd = Math.min(
          Math.min(1, trimStart + maxGap),
          Math.max(trimStart + MIN_GAP, endAtDown + delta),
        );
      } else if (target === "region") {
        const len = endAtDown - startAtDown;
        let s = startAtDown + delta;
        let eVal = endAtDown + delta;
        if (s < 0) {
          s = 0;
          eVal = len;
        }
        if (eVal > 1) {
          eVal = 1;
          s = 1 - len;
        }
        newStart = s;
        newEnd = eVal;
      }

      if (newStart === trimStart && newEnd === trimEnd) return;

      onTrimChange(newStart, newEnd);
      paint(newStart, newEnd);
    };

    const onPointerUp = (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
        canvas.style.cursor = "default";
      }
      dragRef.current = null;
    };

    const duration = audioBuffer.duration;
    const selectedSec = (trimEnd - trimStart) * duration;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <canvas
            ref={canvasCallbackRef}
            className="h-24 w-full touch-none rounded-lg border bg-muted/40"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />

          <div
            ref={playheadRef}
            className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-primary opacity-0"
            style={{ willChange: "transform, opacity" }}
          />

          <button
            type="button"
            onClick={togglePlay}
            className="absolute bottom-2 left-2 flex size-8 items-center justify-center rounded-full bg-foreground/80 text-background shadow-sm transition-colors hover:bg-foreground"
          >
            {isPlaying ? (
              <Pause className="size-3.5" fill="currentColor" />
            ) : (
              <Play className="ml-0.5 size-3.5" fill="currentColor" />
            )}
          </button>

          <span className="absolute bottom-2.5 left-12 text-xs font-medium tabular-nums text-primary">
            {fmtSeconds(selectedSec)}
          </span>
        </div>

        <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{fmtSeconds(trimStart * duration)}</span>
          <span>{fmtSeconds(trimEnd * duration)}</span>
        </div>
      </div>
    );
  },
);

/** seconds → `m:ss.s` for short durations, used in trimmer UI */
function fmtSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, "0")}` : `${s.toFixed(1)}s`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
