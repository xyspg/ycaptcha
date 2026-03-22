"use client";

import { useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
import { SAMPLE_SETS, type SampleSet } from "@/lib/samples";
import { shuffle } from "@/lib/utils";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

interface Demo {
  prompt: string;
  images: { id: string; url: string }[];
}

function buildSingleDemo(set: SampleSet, shuffled = true): Demo {
  const correctCount = 3 + Math.floor(Math.random() * 3); // 3–5
  const correctSet = new Set(set.correctHashes);
  const correct = (shuffled ? shuffle(set.images) : set.images).filter((img) =>
    correctSet.has(img.contentHash),
  );
  const incorrect = (shuffled ? shuffle(set.images) : set.images).filter(
    (img) => !correctSet.has(img.contentHash),
  );
  const picked = shuffle([
    ...correct.slice(0, correctCount),
    ...incorrect.slice(0, CAPTCHA_GRID_SIZE - correctCount),
  ]);
  return {
    prompt: set.name,
    images: picked.map((img) => ({ id: img.contentHash, url: img.url })),
  };
}

function buildDemos(shuffled = true): Demo[] {
  return SAMPLE_SETS.map((set) => buildSingleDemo(set, shuffled));
}

const DESKTOP_POSITIONS = [
  { x: 0, y: 0, rotate: -6, scale: 0.9 },
  { x: 60, y: 40, rotate: -3, scale: 0.95 },
  { x: 120, y: 80, rotate: 0, scale: 1 },
];

export function DemoShowcase() {
  const [demos, setDemos] = useState(() => buildDemos(false));
  const [order, setOrder] = useState([0, 1, 2]);
  const [hovered, setHovered] = useState(false);
  const [errorMessages, setErrorMessages] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [slideDir, setSlideDir] = useState(1);
  const justSwitchedRef = useRef(false);

  useMountEffect(() => {
    setDemos(buildDemos());
  });

  const reshuffleSingle = (demoIndex: number) => {
    setDemos((prev) => {
      const next = [...prev];
      next[demoIndex] = buildSingleDemo(SAMPLE_SETS[demoIndex]);
      return next;
    });
  };

  const bringToFront = (demoIndex: number) => {
    if (order[2] === demoIndex) return;
    justSwitchedRef.current = true;
    const rest = order.filter((o) => o !== demoIndex);
    setOrder([rest[0], rest[1], demoIndex]);
    setTimeout(() => {
      justSwitchedRef.current = false;
    }, 400);
  };

  const cycleForward = () => {
    setSlideDir(1);
    setOrder((prev) => [prev[2], prev[0], prev[1]]);
  };

  const cycleBackward = () => {
    setSlideDir(-1);
    setOrder((prev) => [prev[1], prev[2], prev[0]]);
  };

  const handleVerify = (demoIndex: number, selectedIds: string[]) => {
    if (justSwitchedRef.current) return;
    if (selectedIds.length === 0) return;

    const correctSet = new Set(SAMPLE_SETS[demoIndex].correctHashes);
    const correctCount = selectedIds.filter((id) => correctSet.has(id)).length;
    const totalCorrectInGrid = demos[demoIndex].images.filter((img) =>
      correctSet.has(img.id),
    ).length;
    const allSelected = selectedIds.length === CAPTCHA_GRID_SIZE;

    if (
      !allSelected &&
      correctCount >= totalCorrectInGrid &&
      selectedIds.length === totalCorrectInGrid
    ) {
      setErrorMessages((prev) => {
        const next = [...prev];
        next[demoIndex] = null;
        return next;
      });
      toast.success("Verification passed!");
      cycleForward();
    } else {
      setErrorMessages((prev) => {
        const next = [...prev];
        next[demoIndex] = "Please try again.";
        return next;
      });
      reshuffleSingle(demoIndex);
    }
  };

  const handleRefresh = (demoIndex: number) => {
    if (justSwitchedRef.current) return;
    setErrorMessages((prev) => {
      const next = [...prev];
      next[demoIndex] = null;
      return next;
    });
    reshuffleSingle(demoIndex);
  };

  const frontDemo = order[2];

  const dotIndicators = (
    <div className="flex gap-2">
      {demos.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            setSlideDir(i > frontDemo ? 1 : -1);
            bringToFront(i);
          }}
          className={`size-2 rounded-full transition-colors ${
            frontDemo === i ? "bg-gray-800" : "bg-gray-300 hover:bg-gray-400"
          }`}
          aria-label={`Show demo ${i + 1}`}
        />
      ))}
    </div>
  );

  return (
    <div
      className="relative flex flex-col items-center gap-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Desktop: stacked cards */}
      <div className="hidden lg:block">
        <div className="relative h-[600px] w-[490px]">
          {order.map((demoIndex, stackPos) => (
            <motion.div
              key={demoIndex}
              animate={{
                x: DESKTOP_POSITIONS[stackPos].x,
                y: DESKTOP_POSITIONS[stackPos].y,
                rotate: DESKTOP_POSITIONS[stackPos].rotate,
                scale: DESKTOP_POSITIONS[stackPos].scale,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              className="absolute origin-bottom-left rounded-lg shadow-xl"
              style={{ zIndex: stackPos * 10 }}
            >
              {stackPos < 2 && (
                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => bringToFront(demoIndex)}
                />
              )}
              <CaptchaWidget
                prompt={demos[demoIndex].prompt}
                images={demos[demoIndex].images}
                onVerify={(ids) => handleVerify(demoIndex, ids)}
                onRefresh={() => handleRefresh(demoIndex)}
                errorMessage={errorMessages[demoIndex]}
              />
            </motion.div>
          ))}

          {/* Desktop arrow buttons — show on hover */}
          <button
            type="button"
            onClick={cycleBackward}
            className={`absolute -left-18 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-500 shadow-md backdrop-blur transition-opacity hover:text-gray-800 ${hovered ? "opacity-100" : "opacity-0"}`}
            aria-label="Previous demo"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={cycleForward}
            className={`absolute -right-12 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-500 shadow-md backdrop-blur transition-opacity hover:text-gray-800 ${hovered ? "opacity-100" : "opacity-0"}`}
            aria-label="Next demo"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Mobile: single card with horizontal slide transition */}
      <div className="relative lg:hidden">
        <div className="relative overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
            <motion.div
              key={frontDemo}
              custom={slideDir}
              initial={{ x: slideDir * 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDir * -350, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <CaptchaWidget
                prompt={demos[frontDemo].prompt}
                images={demos[frontDemo].images}
                onVerify={(ids) => handleVerify(frontDemo, ids)}
                onRefresh={() => handleRefresh(frontDemo)}
                errorMessage={errorMessages[frontDemo]}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile nav: arrows + dots in one row */}
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={cycleBackward}
            className="rounded-full bg-white/80 p-1.5 text-gray-500 shadow-md backdrop-blur hover:text-gray-800"
            aria-label="Previous demo"
          >
            <ChevronLeft className="size-4" />
          </button>
          {dotIndicators}
          <button
            type="button"
            onClick={cycleForward}
            className="rounded-full bg-white/80 p-1.5 text-gray-500 shadow-md backdrop-blur hover:text-gray-800"
            aria-label="Next demo"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Desktop dot indicators */}
      <div className="hidden lg:block">{dotIndicators}</div>
    </div>
  );
}
