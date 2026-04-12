import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { getClientIP } from "@/lib/utils";

export const rateLimiters = {
  challenge: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "rl:challenge",
  }),
  verify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:verify",
  }),
  siteverify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "rl:siteverify",
  }),
  image: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "rl:image",
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:auth",
  }),
} as const;

export async function checkRateLimit(
  limiter: Ratelimit,
  request: Request,
): Promise<Response | null> {
  if (process.env.DISABLE_RATE_LIMIT === "true") return null;

  const ip = getClientIP(request);
  const { success, reset } = await limiter.limit(ip);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return null;
}
