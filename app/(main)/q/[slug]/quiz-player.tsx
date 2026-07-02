"use client";

import { PartyPopper, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CaptchaAudioWidget } from "@/components/captcha/captcha-audio-widget";
import { CaptchaWidget } from "@/components/captcha/captcha-widget";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "loading" | "challenge" | "result" | "error";
type WidgetMode = "image" | "audio";

type QuizResult = {
  correctSelections?: number;
  correctCount?: number;
};

export function QuizPlayer({ slug }: { slug: string }) {
  const t = useTranslations("quiz");
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
  const [result, setResult] = useState<QuizResult | null>(null);

  const fetchChallenge = async () => {
    try {
      const res = await fetch("/api/v0/captcha/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizSlug: slug }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPhase("error");
        setErrorText(data?.error ?? t("loadError"));
        return false;
      }

      const data = await res.json();
      setImages(data.images ?? []);
      setPrompt(data.prompt);
      setSessionToken(data.sessionToken);
      setCaptchaMode(data.captchaMode ?? "image");
      setAudioEnabled(!!data.audioEnabled);
      setMode(data.captchaMode === "audio" ? "audio" : "image");
      setPhase("challenge");
      return true;
    } catch {
      setPhase("error");
      setErrorText(t("networkError"));
      return false;
    }
  };

  const handleStart = async () => {
    setPhase("loading");
    setChallengeError(null);
    setResult(null);
    await fetchChallenge();
  };

  const submitVerify = async (payload: Record<string, unknown>) => {
    if (!sessionToken) return;
    const token = sessionToken;
    setSessionToken(null);

    try {
      const res = await fetch("/api/v0/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token, ...payload }),
      });

      const data = await res.json();

      if (data.success) {
        setResult({
          correctSelections: data.correctSelections,
          correctCount: data.correctCount,
        });
        setPhase("result");
        return;
      }

      setChallengeError(data.error ? t("sessionExpired") : t("tryAgain"));
      await fetchChallenge();
    } catch {
      setErrorText(t("networkError"));
      setPhase("error");
    }
  };

  const handleVerify = (selectedIndices: number[]) =>
    submitVerify({ selectedIndices });
  const handleAudioVerify = (textAnswer: string) =>
    submitVerify({ textAnswer });

  const handleRefresh = async () => {
    setChallengeError(null);
    await fetchChallenge();
  };

  if (phase === "idle" || phase === "loading" || phase === "error") {
    return (
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {phase === "error" && errorText && (
          <p className="text-sm text-destructive">{errorText}</p>
        )}
        <Button onClick={handleStart} disabled={phase === "loading"}>
          {phase === "loading"
            ? t("loading")
            : phase === "error"
              ? t("retry")
              : t("start")}
        </Button>
      </div>
    );
  }

  if (phase === "result") {
    const hasAccuracy =
      result?.correctSelections !== undefined &&
      result?.correctCount !== undefined;
    return (
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <PartyPopper className="size-8 text-primary" />
        <h1 className="text-xl font-semibold">{t("passedTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {hasAccuracy
            ? t("passedAccuracy", {
                correct: result.correctSelections as number,
                total: result.correctCount as number,
              })
            : t("passedDescription")}
        </p>
        <Button variant="outline" onClick={handleStart}>
          <RotateCw className="size-3.5" />
          {t("playAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {mode === "image" && (
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

      {mode === "audio" && sessionToken && (
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
