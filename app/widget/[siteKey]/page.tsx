"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  CaptchaCheckbox,
  CaptchaWidget,
} from "@/components/captcha/captcha";
import { CAPTCHA_SESSION_TTL_MS } from "@/lib/types";

type Phase = "idle" | "loading" | "challenge" | "verified" | "failed" | "error";

function getTargetOrigin(): string {
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    // malformed referrer — fall through
  }
  return "*";
}

function postToParent(data: Record<string, unknown>) {
  const target = getTargetOrigin();
  // don't leak verification tokens to unknown origins
  if (target === "*" && "token" in data) return;
  window.parent.postMessage({ source: "ycaptcha", ...data }, target);
}

function postResize(width: number, height: number) {
  postToParent({ event: "resize", width, height });
}

export default function WidgetPage() {
  const { siteKey } = useParams<{ siteKey: string }>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const clearExpiryTimer = () => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  };

  const startExpiryTimer = () => {
    clearExpiryTimer();
    expiryTimerRef.current = setTimeout(() => {
      setSessionToken(null);
      setPhase("idle");
      setErrorText("Session expired");
      postResize(304, 78);
      postToParent({ event: "expired" });
    }, CAPTCHA_SESSION_TTL_MS);
  };

  const fetchChallenge = useCallback(async () => {
    let parentOrigin: string | undefined;
    try {
      if (document.referrer) {
        parentOrigin = new URL(document.referrer).origin;
      }
    } catch {
      // malformed referrer — skip
    }

    try {
      const res = await fetch("/api/v0/captcha/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteKey, ...(parentOrigin && { origin: parentOrigin }) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error ?? "Failed to load challenge";
        setPhase("error");
        setErrorText(msg);
        postToParent({ event: "error", code: res.status, message: msg });
        return false;
      }

      const data = await res.json();
      setImages(data.images);
      setPrompt(data.prompt);
      setSessionToken(data.sessionToken);
      setErrorText(null);
      startExpiryTimer();
      return true;
    } catch {
      setPhase("error");
      setErrorText("Network error");
      postToParent({ event: "error", code: 0, message: "Network error" });
      return false;
    }
  }, [siteKey]);

  const handleRequestChallenge = async () => {
    setPhase("loading");
    const ok = await fetchChallenge();
    if (ok) {
      setTimeout(() => {
        setPhase("challenge");
        postResize(350, 520);
      }, 600);
    }
  };

  const handleVerify = async (selectedIndices: number[]) => {
    if (!sessionToken) return;

    try {
      const res = await fetch("/api/v0/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, selectedIndices }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        clearExpiryTimer();
        setPhase("verified");
        postResize(304, 78);
        postToParent({ event: "success", token: data.token });
        return;
      }

      // Failed — show error, refresh images
      setChallengeError("Please try again.");
      await fetchChallenge();
    } catch {
      setErrorText("Network error");
      setPhase("error");
      postResize(304, 78);
      postToParent({ event: "error", code: 0, message: "Network error" });
    }
  };

  const handleRefresh = async () => {
    await fetchChallenge();
  };

  return (
    <div>
      {phase !== "challenge" && (
        <CaptchaCheckbox
          onRequestChallenge={handleRequestChallenge}
          state={phase === "error" ? "error" : phase}
          errorText={errorText}
        />
      )}

      {phase === "challenge" && (
        <CaptchaWidget
          key={images[0]?.url}
          prompt={prompt}
          images={images}
          onVerify={handleVerify}
          onRefresh={handleRefresh}
          errorMessage={challengeError}
        />
      )}
    </div>
  );
}
