import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { auth } from "./lib/auth";
import { errorHandler } from "./middleware/error";
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
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/api/sites", sites)
  .route("/api/puzzles", puzzles)
  .route("/api/onboarding", onboarding);

app.onError(errorHandler);

export type ApiApp = typeof app;
