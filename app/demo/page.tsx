"use client";

import { useState } from "react";
import { CaptchaContainer, type CaptchaImage } from "@/components/captcha/captcha";

function makeMockImages(seed: number): CaptchaImage[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `img-${i}`,
    url: `https://picsum.photos/seed/${seed + i}/200/200`,
  }));
}

export default function Page() {
  const [images, setImages] = useState(() => makeMockImages(10));

  const handleVerify = (selectedIds: string[]) => {
    // Mock: first 3 images are "correct"
    const correct = new Set(["img-0", "img-1", "img-2"]);
    return (
      selectedIds.every((id) => correct.has(id)) &&
      selectedIds.length === correct.size
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
          prompt="Select all images with|parks"
          images={images}
          onVerify={handleVerify}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
