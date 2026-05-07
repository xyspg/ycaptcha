import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { env } from "../env";
import { type AuthVariables, requireSession } from "../middleware/auth";

const ONBOARDING_DISMISSED_COOKIE = "ycaptcha-onboarding-dismissed";

const onboarding = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .post("/dismiss", async (c) => {
    setCookie(c, ONBOARDING_DISMISSED_COOKIE, "1", {
      httpOnly: false,
      sameSite: "Lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      domain: env.AUTH_COOKIE_DOMAIN,
    });
    return c.json({ message: "Dismissed" });
  });

export { onboarding };
