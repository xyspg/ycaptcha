import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site } from "@/lib/db/app-schema";
import { eq } from "drizzle-orm";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dashboard auth guard
  if (pathname.startsWith("/dashboard")) {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Widget CSP: frame-ancestors based on site's configured domain
  const widgetMatch = pathname.match(/^\/widget\/([^/]+)/);
  if (widgetMatch) {
    const siteKey = widgetMatch[1];

    let frameAncestors = "'self'";
    try {
      const [siteData] = await db
        .select({ domain: site.domain })
        .from(site)
        .where(eq(site.siteKey, siteKey));

      if (siteData?.domain) {
        const localhost = "http://localhost:* http://127.0.0.1:*";
        if (siteData.domain === "localhost") {
          frameAncestors = `'self' ${localhost}`;
        } else {
          frameAncestors = `'self' https://*.${siteData.domain} https://${siteData.domain} ${localhost}`;
        }
      }
    } catch {
      // DB error — fall back to restrictive policy
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
