import { redis } from "@/lib/redis";

const COOLDOWN_SECONDS = 60;
const PER_EMAIL_DAILY = 5;
const GLOBAL_DAILY = 30;
const DAY_SECONDS = 60 * 60 * 24;

export type RateLimitResult =
  | { ok: true }
  | {
      ok: false;
      retryAfter: number;
      reason: "cooldown" | "email_daily" | "global_daily";
    };

export async function checkVerificationEmailLimit(
  email: string,
): Promise<RateLimitResult> {
  const normalized = email.toLowerCase();
  const cooldownKey = `rl:verify-email:${normalized}:cooldown`;
  const dailyKey = `rl:verify-email:${normalized}:daily`;
  const globalKey = "rl:verify-email:global:daily";

  const cooldownTtl = await redis.ttl(cooldownKey);
  if (cooldownTtl > 0) {
    return { ok: false, retryAfter: cooldownTtl, reason: "cooldown" };
  }

  const emailCount = await redis.incr(dailyKey);
  if (emailCount === 1) await redis.expire(dailyKey, DAY_SECONDS);
  if (emailCount > PER_EMAIL_DAILY) {
    const ttl = await redis.ttl(dailyKey);
    return { ok: false, retryAfter: Math.max(ttl, 1), reason: "email_daily" };
  }

  const globalCount = await redis.incr(globalKey);
  if (globalCount === 1) await redis.expire(globalKey, DAY_SECONDS);
  if (globalCount > GLOBAL_DAILY) {
    const ttl = await redis.ttl(globalKey);
    return { ok: false, retryAfter: Math.max(ttl, 1), reason: "global_daily" };
  }

  await redis.set(cooldownKey, "1", { ex: COOLDOWN_SECONDS });

  return { ok: true };
}
