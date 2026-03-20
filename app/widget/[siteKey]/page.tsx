"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { CaptchaContainer, type CaptchaImage } from "@/components/captcha/captcha";

export default function WidgetPage() {
  const { siteKey } = useParams<{ siteKey: string }>();
  const [images, setImages] = useState<CaptchaImage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    const res = await fetch("/api/v0/captcha/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to load challenge");
      return;
    }

    const data = await res.json();
    setImages(data.images);
    setPrompt(data.prompt);
    setSessionToken(data.sessionToken);
    setError(null);
  }, [siteKey]);

  const handleVerify = async (selectedIds: string[]): Promise<boolean> => {
    if (!sessionToken) return false;

    const res = await fetch("/api/v0/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, selectedIds }),
    });

    const data = await res.json();

    if (data.success && data.token) {
      window.parent.postMessage(
        { source: "ycaptcha", event: "success", token: data.token },
        "*",
      );
      return true;
    }

    await fetchChallenge();
    return false;
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-2">
      <CaptchaContainer
        prompt={prompt || "Loading..."}
        images={images}
        onVerify={handleVerify}
        onRefresh={fetchChallenge}
        error={error}
      />
    </div>
  );
}
