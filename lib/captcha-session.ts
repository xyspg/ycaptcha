import { nanoid } from "nanoid";
import { redis } from "@/lib/redis";
import { CAPTCHA_SESSION_TTL_S } from "@/lib/types";

export interface ChallengeSession {
  puzzleId: string;
  siteId: string;
  imageUrls: string[];
  imageIds: string[]; // display order — indices match the grid
  correctImageIds: string[];
  correctCount: number;
  difficulty: number;
}

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

export async function createChallengeSession(
  data: ChallengeSession,
): Promise<string> {
  const token = nanoid(64);
  await redis.setex(challengeKey(token), CAPTCHA_SESSION_TTL_S, data);
  return token;
}

export async function getChallengeSession(
  token: string,
): Promise<ChallengeSession | null> {
  return redis.get<ChallengeSession>(challengeKey(token));
}

export async function deleteChallengeSession(token: string): Promise<void> {
  await redis.del(challengeKey(token));
}

// getdel is atomic — prevents double-spend
export async function consumeChallengeSession(
  token: string,
): Promise<ChallengeSession | null> {
  return redis.getdel<ChallengeSession>(challengeKey(token));
}

export async function createVerifiedSession(
  data: VerifiedSession,
): Promise<string> {
  const token = nanoid(64);
  await redis.setex(verifiedKey(token), CAPTCHA_SESSION_TTL_S, data);
  return token;
}

export async function getVerifiedSession(
  token: string,
): Promise<VerifiedSession | null> {
  return redis.get<VerifiedSession>(verifiedKey(token));
}

export async function consumeVerifiedSession(
  token: string,
): Promise<VerifiedSession | null> {
  return redis.getdel<VerifiedSession>(verifiedKey(token));
}
