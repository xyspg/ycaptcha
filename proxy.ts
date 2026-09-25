import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIES } from "@/lib/auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic check (cookie presence only): importing lib/auth here would
  // load the whole auth stack on every cold start. Dashboard pages validate
  // the session themselves via requireSession().
  if (pathname.startsWith("/dashboard")) {
    if (!SESSION_COOKIES.some((name) => request.cookies.get(name)?.value)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Widget CSP: frame-ancestors based on site's configured domain
  const widgetMatch = pathname.match(/^\/widget\/([^/]+)/);
  if (widgetMatch) {
    const siteKey = widgetMatch[1];

    let frameAncestors = "'self'";
    try {
      // Loaded lazily so /dashboard requests don't pay for the DB client.
      const { getSiteDomain } = await import("@/lib/site-domain");
      const domain = await getSiteDomain(siteKey);

      if (domain) {
        const localhost = "http://localhost:* http://127.0.0.1:*";
        const isDev = process.env.NODE_ENV !== "production";
        if (domain === "localhost") {
          frameAncestors = `'self' ${localhost}`;
        } else {
          frameAncestors = `'self' https://*.${domain} https://${domain}${isDev ? ` ${localhost}` : ""}`;
        }
      }
    } catch (e) {
      // DB error — fall back to restrictive policy
      console.error(e);
    }

    const response = NextResponse.next();
    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${frameAncestors}`,
    );
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/widget/:path*"],
};
