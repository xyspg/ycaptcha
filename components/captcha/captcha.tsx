"use client";

import { useState } from "react";
import { CaptchaCheckbox } from "./captcha-checkbox";
import { CaptchaWidget, type CaptchaImage } from "./captcha-widget";

type Phase = "idle" | "loading" | "challenge" | "verified" | "failed";

interface CaptchaContainerProps {
  prompt: string;
  images: CaptchaImage[];
  /** Called when user submits selections. Return `true` if correct, `false` if wrong. */
  onVerify: (selectedIds: string[]) => boolean | Promise<boolean>;
  onRefresh: () => void | Promise<void>;
  onCompleted?: () => void;
  /** Fatal error (e.g. invalid siteKey). Disables the widget. */
  error?: string | null;
}

export function CaptchaContainer({
  prompt,
  images,
  onVerify,
  onRefresh,
  onCompleted,
  error,
}: CaptchaContainerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestChallenge = async () => {
    setPhase("loading");
    await onRefresh();
    // If error prop gets set by parent, phase will update via error prop
    // Otherwise show challenge after a brief delay
    setTimeout(() => {
      setPhase((prev) => (prev === "loading" ? "challenge" : prev));
    }, 800);
  };

  const handleVerify = async (selectedIds: string[]) => {
    const pass = await onVerify(selectedIds);

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
        state={error ? "error" : phase === "challenge" ? "challenge" : phase}
        errorText={error}
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
