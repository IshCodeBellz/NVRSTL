import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Middleware goals:
// 1. Redirect authenticated admin users hitting auth entry points (/login, /register) to /admin (but allow /)
// 2. Protect /admin routes: non-admins redirected to / (or login if not authenticated)

const ADMIN_REDIRECT_SOURCES = new Set(["/login", "/register"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only run logic for relevant paths to keep perf high
  if (!pathname.startsWith("/admin") && !ADMIN_REDIRECT_SOURCES.has(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;
  const isAdmin = !!(token as any)?.isAdmin;

  // Rule 1: auto-redirect admin away from public entry points
  if (isAdmin && ADMIN_REDIRECT_SOURCES.has(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Rule 2: protect /admin
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/admin/:path*"],
};
