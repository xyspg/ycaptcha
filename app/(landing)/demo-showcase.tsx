"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
import { SAMPLE_SETS } from "@/lib/samples";
import { shuffle } from "@/lib/utils";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

interface Demo {
  prompt: string;
  images: { id: string; url: string }[];
}

// Build 9-image grids from sample sets
function buildDemos(): Demo[] {
  return SAMPLE_SETS.map((set) => ({
    prompt: set.name,
    images: shuffle(set.images)
      .slice(0, CAPTCHA_GRID_SIZE)
      .map((img) => ({ id: img.contentHash, url: img.url })),
  }));
}

const CARD_POSITIONS = [
  { x: 0, y: 0, rotate: -6, scale: 0.9 },
  { x: 60, y: 40, rotate: -3, scale: 0.95 },
  { x: 120, y: 80, rotate: 0, scale: 1 },
];

export function DemoShowcase() {
  const [demos] = useState(buildDemos);
  const [order, setOrder] = useState([0, 1, 2]);

  const cycleToNext = () => {
    setOrder((prev) => [prev[2], prev[0], prev[1]]);
  };

  return (
    <div className="relative hidden h-[600px] w-full lg:block">
      {order.map((demoIndex, stackPos) => (
        <motion.div
          key={demoIndex}
          animate={{
            x: CARD_POSITIONS[stackPos].x,
            y: CARD_POSITIONS[stackPos].y,
            rotate: CARD_POSITIONS[stackPos].rotate,
            scale: CARD_POSITIONS[stackPos].scale,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          className="absolute origin-bottom-left rounded-lg shadow-xl"
          style={{ zIndex: stackPos * 10, pointerEvents: stackPos === 2 ? "auto" : "none" }}
          onClick={stackPos === 2 ? cycleToNext : undefined}
        >
          <CaptchaWidget
            prompt={demos[demoIndex].prompt}
            images={demos[demoIndex].images}
            onVerify={cycleToNext}
            onRefresh={cycleToNext}
          />
        </motion.div>
      ))}

      {/* Dot indicators */}
      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-2">
        {demos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const rest = order.filter((o) => o !== i);
              setOrder([rest[0], rest[1], i]);
            }}
            className={`size-2 rounded-full transition-colors ${
              order[2] === i ? "bg-gray-800" : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Show demo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
