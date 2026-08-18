import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/features/auth/constants";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/stripe-webhook",
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// Optimistic check only: it confirms a session cookie is present, not that
// the session is still valid, since that requires a DB lookup and Prisma
// can't run in the Edge runtime middleware executes in. The authoritative
// check happens in the (main) layout and every server action, both of which
// call getCurrentSession() and actually touch the database.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) return NextResponse.next();

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
