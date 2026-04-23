"use client";

import { useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

const DEFAULT_COOLDOWN_SECONDS = 60;

export type ResendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "cooldown"; until: number }
  | {
      kind: "rateLimited";
      until: number;
      reason: "cooldown" | "email_daily" | "global_daily";
    };

type Options = {
  email: string;
  callbackURL: string;
  startWithCooldown?: boolean;
};

export function useResendVerification({
  email,
  callbackURL,
  startWithCooldown = false,
}: Options) {
  const [state, setState] = useState<ResendState>(() =>
    startWithCooldown
      ? {
          kind: "cooldown",
          until: Date.now() + DEFAULT_COOLDOWN_SECONDS * 1000,
        }
      : { kind: "idle" },
  );
  const [now, setNow] = useState<number>(() => Date.now());

  useMountEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  });

  const secondsLeft =
    state.kind === "cooldown" || state.kind === "rateLimited"
      ? Math.max(0, Math.ceil((state.until - now) / 1000))
      : 0;

  async function resend() {
    if (state.kind === "sending") return;
    if (
      (state.kind === "cooldown" || state.kind === "rateLimited") &&
      secondsLeft > 0
    )
      return;

    setState({ kind: "sending" });

    const res = await fetch("/api/auth/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, callbackURL }),
    });

    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as {
        retryAfter?: number;
        reason?: "cooldown" | "email_daily" | "global_daily";
      };
      const seconds = data.retryAfter ?? DEFAULT_COOLDOWN_SECONDS;
      setState({
        kind: "rateLimited",
        until: Date.now() + seconds * 1000,
        reason: data.reason ?? "cooldown",
      });
      return;
    }

    if (!res.ok) {
      // Treat unknown errors as cooldown so the user can retry after a moment
      setState({
        kind: "cooldown",
        until: Date.now() + DEFAULT_COOLDOWN_SECONDS * 1000,
      });
      return;
    }

    setState({
      kind: "cooldown",
      until: Date.now() + DEFAULT_COOLDOWN_SECONDS * 1000,
    });
  }

  return {
    state,
    secondsLeft,
    resend,
    isDisabled: state.kind === "sending" || secondsLeft > 0,
  };
}
