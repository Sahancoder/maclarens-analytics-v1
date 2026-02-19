import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Frontend Route Protection Middleware
 *
 * Protects dashboard routes by checking for the presence of a NextAuth
 * session cookie. Without it, users are redirected to the home page.
 *
 * Note: This is a client-side guard only. The backend JWT validation
 * in the API layer is the true security boundary.
 */

const PROTECTED_PREFIXES = [
  "/finance-officer",
  "/finance-director",
  "/system-admin",
  "/md",
];

const PUBLIC_PATHS = [
  "/",
  "/auth/callback",
  "/api",
  "/health",
  "/dev",
  "/_next",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie (set by next-auth after Microsoft login)
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    // No session — redirect to home page
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "SessionRequired");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/finance-officer/:path*",
    "/finance-director/:path*",
    "/system-admin/:path*",
    "/md/:path*",
  ],
};
