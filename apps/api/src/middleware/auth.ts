import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth";

type SessionShape = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
type AuthUser = SessionShape["user"];
type AuthSession = SessionShape["session"];

export type AuthVariables = {
  user: AuthUser;
  session: AuthSession;
};

/**
 * Reads a better-auth session from the request and attaches it to the Hono
 * context. Returns 401 when no valid session cookie is present.
 */
export const requireSession = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

/**
 * Same as requireSession but returns null instead of 401 when missing —
 * useful for endpoints that have both anonymous and authenticated paths.
 */
export const optionalSession = createMiddleware<{
  Variables: { user: AuthUser | null; session: AuthSession | null };
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
