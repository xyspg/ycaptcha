import { getChallengeSession } from "@/lib/captcha-session";
import { proxyR2Asset } from "@/lib/r2";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

/**
 * GET /api/v0/captcha/audio/[sessionToken]
 *
 * Audio proxy for CAPTCHA challenges. Hides the R2 URL from the client.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionToken: string }> },
) {
  const limited = await checkRateLimit(rateLimiters.audio, request);
  if (limited) return limited;

  const { sessionToken } = await params;
  const session = await getChallengeSession(sessionToken);

  if (!session) {
    return new Response("Session not found or expired", { status: 404 });
  }
  if (!session.audioUrl) {
    return new Response("No audio configured for this session", {
      status: 404,
    });
  }

  return proxyR2Asset(session.audioUrl, "audio/wav");
}
