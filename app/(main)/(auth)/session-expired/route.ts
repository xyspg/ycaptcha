import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SESSION_COOKIES } from "@/lib/auth/constants";

// requireSession() sends stale session cookies here. Finding no session,
// better-auth deletes its cookies through nextCookies, which (unlike in a
// Server Component) can write to this response.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  const login = new URL("/login", request.url);
  const from = request.nextUrl.searchParams.get("redirect");
  if (from) login.searchParams.set("redirect", from);
  const response = NextResponse.redirect(login);

  // better-auth leaves cookies with a bad signature (e.g. after a secret
  // rotation) in place, and those would keep the `/` edge redirect bouncing.
  if (!session) {
    for (const name of SESSION_COOKIES) {
      if (!request.cookies.has(name)) continue;
      // expires, not maxAge: 0, which the serializer drops as falsy
      response.cookies.set(name, "", {
        path: "/",
        expires: new Date(0),
        httpOnly: true,
        sameSite: "lax",
        secure: name.startsWith("__Secure-"),
      });
    }
  }
  return response;
}
