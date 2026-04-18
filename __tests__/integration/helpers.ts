import { vi } from "vitest";
import { getChallengeSession } from "@/lib/captcha-session";

/**
 * Create a POST Request with JSON body for passing to route handlers.
 */
export function postRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Get correct and incorrect grid indices from a challenge session in one Redis call.
 */
export async function getChallengeIndices(sessionToken: string) {
  const session = await getChallengeSession(sessionToken);
  if (!session) throw new Error("Session not found");

  const correctSet = new Set(session.correctImageIds);
  const correct: number[] = [];
  const incorrect: number[] = [];
  for (let i = 0; i < session.imageIds.length; i++) {
    (correctSet.has(session.imageIds[i]) ? correct : incorrect).push(i);
  }
  return { correct, incorrect };
}

/**
 * Shorthand for just the correct indices.
 */
export async function getCorrectIndices(
  sessionToken: string,
): Promise<number[]> {
  return (await getChallengeIndices(sessionToken)).correct;
}

/**
 * Get a fresh challenge session token from the challenge route.
 */
export async function getChallenge(siteKey: string, origin?: string) {
  const { POST } = await import("@/app/(main)/api/v0/captcha/challenge/route");
  const body: Record<string, unknown> = { siteKey };
  if (origin) body.origin = origin;
  const res = await POST(postRequest(body));
  return (await res.json()) as { sessionToken: string; prompt: string };
}

/**
 * Run the full challenge → verify flow and return the verification token.
 */
export async function getVerificationToken(
  siteKey: string,
  origin?: string,
): Promise<string> {
  const { sessionToken } = await getChallenge(siteKey, origin);
  const correctIndices = await getCorrectIndices(sessionToken);

  const { POST: verifyPOST } = await import(
    "@/app/(main)/api/v0/captcha/verify/route"
  );
  const verifyRes = await verifyPOST(
    postRequest({ sessionToken, selectedIndices: correctIndices }),
  );
  const { token } = await verifyRes.json();
  return token;
}

/**
 * Audio counterpart to {@link getVerificationToken} — challenge → text-answer
 * verify, returns the consumed-once verification token.
 */
export async function getAudioVerificationToken(
  siteKey: string,
  textAnswer: string,
): Promise<string> {
  const { sessionToken } = await getChallenge(siteKey);

  const { POST: verifyPOST } = await import(
    "@/app/(main)/api/v0/captcha/verify/route"
  );
  const verifyRes = await verifyPOST(postRequest({ sessionToken, textAnswer }));
  const { token } = await verifyRes.json();
  return token;
}

// ── R2 fetch mock ────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

/** Mock fetch only for R2 asset URLs, pass through everything else (Neon, Upstash). */
export function mockR2Fetch() {
  globalThis.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("r2.ycaptcha.xyspg.moe")) {
        // Match the bucket prefix so audio + image proxies both get a
        // realistic Content-Type without leaking through to real R2.
        const isAudio = /\/audio\//.test(url);
        return new Response(Buffer.from("fake-asset-data"), {
          status: 200,
          headers: {
            "Content-Type": isAudio ? "audio/wav" : "image/webp",
          },
        });
      }

      return originalFetch(input, init);
    },
  ) as typeof fetch;
}

/** Restore the original global fetch. */
export function restoreFetch() {
  globalThis.fetch = originalFetch;
}
