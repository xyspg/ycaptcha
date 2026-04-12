import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  return handler.GET!(request);
}

export async function POST(request: Request) {
  const limited = await checkRateLimit(rateLimiters.auth, request);
  if (limited) return limited;
  return handler.POST!(request);
}
