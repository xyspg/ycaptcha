import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { checkVerificationEmailLimit } from "@/lib/email/verification-rate-limit";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  return handler.GET!(request);
}

export async function POST(request: Request) {
  const limited = await checkRateLimit(rateLimiters.auth, request);
  if (limited) return limited;

  const url = new URL(request.url);
  if (url.pathname.endsWith("/send-verification-email")) {
    const cloned = request.clone();
    const { email } = (await cloned.json().catch(() => ({}))) as {
      email?: string;
    };

    if (email) {
      const result = await checkVerificationEmailLimit(email);
      if (!result.ok) {
        return new Response(
          JSON.stringify({
            code: "TOO_MANY_REQUESTS",
            reason: result.reason,
            retryAfter: result.retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(result.retryAfter),
            },
          },
        );
      }
    }
  }

  return handler.POST!(request);
}
