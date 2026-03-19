"use client";

import { useState } from "react";
import { CaptchaCheckbox } from "./captcha-checkbox";
import { CaptchaWidget, type CaptchaImage } from "./captcha-widget";

type Phase = "idle" | "loading" | "challenge" | "verified" | "failed";

interface CaptchaContainerProps {
  prompt: string;
  images: CaptchaImage[];
  /** Called when user submits selections. Return `true` if correct, `false` if wrong. */
  onVerify: (selectedIds: string[]) => boolean;
  onRefresh: () => void;
  onCompleted?: () => void;
}

export function CaptchaContainer({
  prompt,
  images,
  onVerify,
  onRefresh,
  onCompleted,
}: CaptchaContainerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestChallenge = () => {
    setPhase("loading");
    setTimeout(() => setPhase("challenge"), 800);
  };

  const handleVerify = (selectedIds: string[]) => {
    const pass = onVerify(selectedIds);

    if (pass) {
      setPhase("verified");
      onCompleted?.();
    } else {
      setErrorMessage("Please try again.");
      onRefresh();
    }
  };

  const handleRefresh = () => {
    onRefresh();
  };

  const handleDismiss = () => {
    setPhase("idle");
    setErrorMessage(null);
  };

  return (
    <div className="relative inline-block">
      <CaptchaCheckbox
        onRequestChallenge={handleRequestChallenge}
        state={phase === "challenge" ? "challenge" : phase}
      />

      {phase === "challenge" && (
        <>
          {/* Mobile: fullscreen backdrop + centered widget */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:hidden"
            onClick={handleDismiss}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <CaptchaWidget
                key={images[0]?.id}
                prompt={prompt}
                images={images}
                onVerify={handleVerify}
                onRefresh={handleRefresh}
                errorMessage={errorMessage}
              />
            </div>
          </div>

          {/* Desktop: transparent backdrop + float widget to the right */}
          <div
            className="fixed inset-0 z-40 hidden md:block"
            onClick={handleDismiss}
          />
          <div className="absolute top-0 left-full z-50 ml-2 hidden md:block">
            <CaptchaWidget
              key={images[0]?.id}
              prompt={prompt}
              images={images}
              onVerify={handleVerify}
              onRefresh={handleRefresh}
              errorMessage={errorMessage}
            />
          </div>
        </>
      )}
    </div>
  );
}

export { CaptchaCheckbox } from "./captcha-checkbox";
export { CaptchaWidget, type CaptchaImage } from "./captcha-widget";
