import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { auth } from "./lib/auth";
import { errorHandler } from "./middleware/error";
import { rateLimit } from "./middleware/rate-limit";
import { analytics } from "./routes/analytics";
import { audioRoute } from "./routes/audio";
import { captcha } from "./routes/captcha";
import { imageSets } from "./routes/image-sets";
import { onboarding } from "./routes/onboarding";
import { puzzles } from "./routes/puzzles";
import { sites } from "./routes/sites";

const corsOrigins = env.AUTH_TRUSTED_ORIGINS?.split(",")
  .map((o) => o.trim())
  .filter(Boolean) ?? ["http://localhost:5173"];

export const app = new Hono()
  .use(
    "*",
    cors({
      origin: corsOrigins,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  )
  .get("/health", (c) => c.json({ ok: true, service: "api" }))
  // Per-IP limiter on auth POSTs (sign-in/up, password reset, etc.) layered on
  // top of better-auth's own rules. GET (e.g. get-session) is left unthrottled
  // since the dashboard polls it on every navigation.
  .use("/api/auth/*", (c, next) =>
    c.req.method === "POST" ? rateLimit("auth")(c, next) : next(),
  )
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/api/v1/sites", sites)
  .route("/api/v1/puzzles", puzzles)
  .route("/api/v1/image-sets", imageSets)
  .route("/api/v1/audio", audioRoute)
  .route("/api/v1/analytics", analytics)
  .route("/api/v1/onboarding", onboarding)
  .route("/api/v1/captcha", captcha);

app.onError(errorHandler);

export type ApiApp = typeof app;
