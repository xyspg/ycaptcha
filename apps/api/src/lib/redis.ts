import Redis from "ioredis";
import { env } from "../env";

const client = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

client.on("error", (err) => {
  console.error("[redis] connection error", err);
});

export const rawRedis = client;

/**
 * Upstash-compatible thin wrapper so `lib/captcha-session.ts` and
 * `auth.ts` `secondaryStorage` port verbatim.
 *
 * - JSON-encodes objects on `set`/`setex`, JSON-decodes on `get`/`getdel`
 * - String values pass through untouched
 * - `set(k, v, { ex })` mirrors Upstash's options bag
 */
export const redis = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await client.get(key);
    return decode<T>(raw);
  },

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number },
  ): Promise<void> {
    const encoded = encode(value);
    if (options?.ex) {
      await client.set(key, encoded, "EX", options.ex);
    } else {
      await client.set(key, encoded);
    }
  },

  async setex(key: string, ttlSeconds: number, value: unknown): Promise<void> {
    await client.set(key, encode(value), "EX", ttlSeconds);
  },

  async del(key: string): Promise<void> {
    await client.del(key);
  },

  async getdel<T = unknown>(key: string): Promise<T | null> {
    const raw = await client.getdel(key);
    return decode<T>(raw);
  },

  async incr(key: string): Promise<number> {
    return client.incr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await client.expire(key, ttlSeconds);
  },

  async ttl(key: string): Promise<number> {
    return client.ttl(key);
  },
};

function encode(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function decode<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}
