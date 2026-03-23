import { nanoid } from "nanoid";
import { redis } from "@/lib/redis";
import { CAPTCHA_SESSION_TTL_S } from "@/lib/types";

/**
 * Challenge session — created when a user loads a CAPTCHA.
 * Stored at `captcha:session:{token}`.
 */
export interface ChallengeSession {
  puzzleId: string;
  siteId: string;
  imageUrls: string[];
  /** Image IDs in display order (indices match the grid) */
  imageIds: string[];
  /** Which image IDs are correct answers */
  correctImageIds: string[];
  correctCount: number;
  difficulty: number;
}

/**
 * Verified session — created after a user solves the CAPTCHA.
 * Stored at `captcha:verified:{token}`.
 */
export interface VerifiedSession {
  puzzleId: string;
  siteId: string;
}

function challengeKey(token: string) {
  return `captcha:session:${token}`;
}

function verifiedKey(token: string) {
  return `captcha:verified:${token}`;
}

/** Create a new challenge session. Returns the token. */
export async function createChallengeSession(
  data: ChallengeSession,
): Promise<string> {
  const token = nanoid(64);
  await redis.setex(challengeKey(token), CAPTCHA_SESSION_TTL_S, data);
  return token;
}

/** Get a challenge session by token. Returns null if expired or not found. */
export async function getChallengeSession(
  token: string,
): Promise<ChallengeSession | null> {
  return redis.get<ChallengeSession>(challengeKey(token));
}

/** Delete a challenge session (after verify). */
export async function deleteChallengeSession(token: string): Promise<void> {
  await redis.del(challengeKey(token));
}

/** Atomically get and delete a challenge session (one-time use). Returns null if not found. */
export async function consumeChallengeSession(
  token: string,
): Promise<ChallengeSession | null> {
  return redis.getdel<ChallengeSession>(challengeKey(token));
}

/** Create a verified session (after successful verify). Returns the verification token. */
export async function createVerifiedSession(
  data: VerifiedSession,
): Promise<string> {
  const token = nanoid(64);
  await redis.setex(verifiedKey(token), CAPTCHA_SESSION_TTL_S, data);
  return token;
}

/** Atomically get and delete a verified session (one-time use). Returns null if not found. */
export async function consumeVerifiedSession(
  token: string,
): Promise<VerifiedSession | null> {
  return redis.getdel<VerifiedSession>(verifiedKey(token));
}
