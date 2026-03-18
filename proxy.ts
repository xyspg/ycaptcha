import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
    const session = await getSession();

    if(!session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};