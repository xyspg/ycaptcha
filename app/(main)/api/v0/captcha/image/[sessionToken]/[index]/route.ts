import { getChallengeSession } from "@/lib/captcha-session";
import { env } from "@/lib/env";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

/**
 * GET /api/v0/captcha/image/[sessionToken]/[index]
 *
 * Image proxy for CAPTCHA challenges. Fetches the actual image from R2
 * and pipes it back without exposing the real URL. Each session has its
 * own randomized image order, so the same index maps to different images
 * across sessions — preventing cross-session image fingerprinting.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionToken: string; index: string }> },
) {
  const limited = await checkRateLimit(rateLimiters.image, request);
  if (limited) return limited;

  const { sessionToken, index: indexStr } = await params;

  const index = parseInt(indexStr, 10);
  if (Number.isNaN(index) || index < 0 || index >= CAPTCHA_GRID_SIZE) {
    return new Response("Invalid index", { status: 400 });
  }

  const session = await getChallengeSession(sessionToken);

  if (!session) {
    return new Response("Session not found or expired", { status: 404 });
  }

  const imageUrls = session.imageUrls;
  if (index >= imageUrls.length) {
    return new Response("Index out of range", { status: 400 });
  }

  // Belt-and-braces: URLs come from the DB and should always be R2 public
  // URLs, but assert before fetching so a bad row can't turn this proxy into
  // an SSRF vector.
  if (!imageUrls[index].startsWith(`${env.NEXT_PUBLIC_R2_PUBLIC_URL}/`)) {
    return new Response("Invalid image source", { status: 403 });
  }

  const imageRes = await fetch(imageUrls[index]);
  if (!imageRes.ok) {
    return new Response("Image not found", { status: 502 });
  }

  return new Response(imageRes.body, {
    status: 200,
    headers: {
      "Content-Type": imageRes.headers.get("Content-Type") ?? "image/webp",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
