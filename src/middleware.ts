import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
  // Check for Better Auth session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie?.value) {
    // No session, redirect to sign-in
    const signInUrl = new URL("/auth/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes requiring authentication
    "/dashboard/:path*",
    "/entities/:path*",
    "/graph/:path*",
    "/reports/:path*",
    "/osint/:path*",
    "/tracking/:path*",
    "/search/:path*",
    "/analysis/:path*",
    "/settings/:path*",
    "/account/:path*",
  ],
};
