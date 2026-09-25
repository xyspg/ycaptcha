import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { PATHNAME_HEADER, SESSION_COOKIES } from "@/lib/auth/constants";

// Deduped per request: layouts and pages both read the session.
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const [hdrs, store] = await Promise.all([headers(), cookies()]);
    const from = hdrs.get(PATHNAME_HEADER);
    const query = from ? `?redirect=${encodeURIComponent(from)}` : "";
    // A cookie with no live session behind it (revoked, expired) must be
    // cleared by a route handler, since Server Components can't set cookies.
    // Left in place, the `/` -> /dashboard edge redirect keeps bouncing the
    // user to /login until it expires.
    const stale = SESSION_COOKIES.some((name) => store.get(name)?.value);
    redirect(`${stale ? "/session-expired" : "/login"}${query}`);
  }
  return session;
}
