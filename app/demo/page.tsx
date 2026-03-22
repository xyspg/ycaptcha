"use client";

import { useState } from "react";
import { CaptchaContainer } from "@/components/captcha/captcha";

function makeMockImages(seed: number) {
  return Array.from({ length: 9 }, (_, i) => ({
    url: `https://picsum.photos/seed/${seed + i}/200/200`,
  }));
}

export default function Page() {
  const [images, setImages] = useState(() => makeMockImages(10));

  const handleVerify = (selectedIndices: number[]) => {
    // Mock: first 3 images (indices 0, 1, 2) are "correct"
    const correctIndices = new Set([0, 1, 2]);
    return (
      selectedIndices.every((i) => correctIndices.has(i)) &&
      selectedIndices.length === correctIndices.size
    );
  };

  const handleRefresh = () => {
    setImages(makeMockImages(Math.floor(Math.random() * 1000)));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-xl font-semibold">yCAPTCHA Demo</h1>
        <CaptchaContainer
          prompt="parks"
          images={images}
          onVerify={handleVerify}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
