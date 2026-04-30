"use client";

import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { CaptchaCheckbox, CaptchaWidget } from "@/components/captcha/captcha";
import { CaptchaAudioWidget } from "@/components/captcha/captcha-audio-widget";
import { CAPTCHA_SESSION_TTL_MS } from "@/lib/types";

type Phase = "idle" | "loading" | "challenge" | "verified" | "failed" | "error";
type WidgetMode = "image" | "audio";

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
  if (target === "*" && "token" in data) {
    // Refusing to broadcast a verification token to "*" — but tell the parent
    // why so it can surface a real error instead of a silently stuck widget.
    window.parent.postMessage(
      { source: "ycaptcha", event: "error", code: "NO_REFERRER" },
      "*",
    );
    return;
  }
  window.parent.postMessage({ source: "ycaptcha", ...data }, target);
}

function postResize(width: number, height: number) {
  postToParent({ event: "resize", width, height });
}

export default function WidgetPage() {
  const { siteKey } = useParams<{ siteKey: string }>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<WidgetMode>("image");
  const [captchaMode, setCaptchaMode] = useState<
    "image" | "audio" | "combined"
  >("image");
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const startExpiryTimer = useCallback(() => {
    clearExpiryTimer();
    expiryTimerRef.current = setTimeout(() => {
      setSessionToken(null);
      setPhase("idle");
      setErrorText("Session expired");
      postResize(304, 78);
      postToParent({ event: "expired" });
    }, CAPTCHA_SESSION_TTL_MS);
  }, [clearExpiryTimer]);

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
        body: JSON.stringify({
          siteKey,
          ...(parentOrigin && { origin: parentOrigin }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error ?? "Failed to load challenge";
        setPhase("error");
        setErrorText(msg);
        postToParent({ event: "error", code: res.status, message: msg });
        return { ok: false as const };
      }

      const data = await res.json();
      const nextMode: WidgetMode =
        data.captchaMode === "audio" ? "audio" : "image";
      setImages(data.images ?? []);
      setPrompt(data.prompt);
      setSessionToken(data.sessionToken);
      setCaptchaMode(data.captchaMode ?? "image");
      setAudioEnabled(!!data.audioEnabled);
      setMode(nextMode);
      setErrorText(null);
      startExpiryTimer();
      return { ok: true as const, mode: nextMode };
    } catch {
      setPhase("error");
      setErrorText("Network error");
      postToParent({ event: "error", code: 0, message: "Network error" });
      return { ok: false as const };
    }
  }, [siteKey, startExpiryTimer]);

  const handleRequestChallenge = async () => {
    setPhase("loading");
    const result = await fetchChallenge();
    if (result.ok) {
      setTimeout(() => {
        setPhase("challenge");
        const [w, h] = result.mode === "audio" ? [300, 320] : [350, 520];
        postResize(w, h);
      }, 600);
    }
  };

  const handleVerify = async (selectedIndices: number[]) => {
    if (!sessionToken) return;
    const token = sessionToken;
    setSessionToken(null);

    try {
      const res = await fetch("/api/v0/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token, selectedIndices }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        clearExpiryTimer();
        setPhase("verified");
        postResize(304, 78);
        postToParent({ event: "success", token: data.token });
        return;
      }

      setChallengeError("Please try again.");
      await fetchChallenge();
    } catch {
      setErrorText("Network error");
      setPhase("error");
      postResize(304, 78);
      postToParent({ event: "error", code: 0, message: "Network error" });
    }
  };

  const handleAudioVerify = async (textAnswer: string) => {
    if (!sessionToken) return;
    const token = sessionToken;
    setSessionToken(null);

    try {
      const res = await fetch("/api/v0/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token, textAnswer }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        clearExpiryTimer();
        setPhase("verified");
        postResize(304, 78);
        postToParent({ event: "success", token: data.token });
        return;
      }

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

      {phase === "challenge" && mode === "image" && (
        <CaptchaWidget
          key={images[0]?.url}
          prompt={prompt}
          images={images}
          onVerify={handleVerify}
          onRefresh={handleRefresh}
          onSwitchToAudio={() => setMode("audio")}
          audioEnabled={audioEnabled}
          errorMessage={challengeError}
        />
      )}

      {phase === "challenge" && mode === "audio" && sessionToken && (
        <CaptchaAudioWidget
          audioUrl={`/api/v0/captcha/audio/${sessionToken}`}
          onVerify={handleAudioVerify}
          onSwitchToImage={
            captchaMode === "combined" ? () => setMode("image") : undefined
          }
          onRefresh={handleRefresh}
          errorMessage={challengeError}
        />
      )}
    </div>
  );
}
