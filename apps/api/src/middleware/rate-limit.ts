import { createMiddleware } from "hono/factory";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { env } from "../env";
import { rawRedis } from "../lib/redis";
import { getClientIP } from "../lib/utils";

type LimitConfig = { points: number; durationSec: number };

const limits = {
  challenge: { points: 20, durationSec: 60 },
  verify: { points: 10, durationSec: 60 },
  siteverify: { points: 100, durationSec: 60 },
  image: { points: 60, durationSec: 60 },
  audio: { points: 30, durationSec: 60 },
  auth: { points: 10, durationSec: 60 },
} as const satisfies Record<string, LimitConfig>;

export type LimiterName = keyof typeof limits;

const limiters = Object.fromEntries(
  Object.entries(limits).map(([name, cfg]) => [
    name,
    new RateLimiterRedis({
      storeClient: rawRedis,
      keyPrefix: `rl:${name}`,
      points: cfg.points,
      duration: cfg.durationSec,
    }),
  ]),
) as Record<LimiterName, RateLimiterRedis>;

export function rateLimit(name: LimiterName) {
  return createMiddleware(async (c, next) => {
    if (env.DISABLE_RATE_LIMIT === "true") {
      await next();
      return;
    }

    const ip = getClientIP(c.req.raw);
    try {
      await limiters[name].consume(ip);
      await next();
    } catch (res) {
      const retryAfter =
        res && typeof res === "object" && "msBeforeNext" in res
          ? Math.ceil(
              Number((res as { msBeforeNext: number }).msBeforeNext) / 1000,
            )
          : 60;
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests", retryAfter }, 429);
    }
  });
}
