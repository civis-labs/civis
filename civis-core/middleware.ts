import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // The domains we want to treat as the "app" domain
  const isAppDomain =
    hostname === "feed.civis.run" ||
    hostname === "app.civis.run" ||
    hostname.startsWith("feed.localhost") ||
    hostname.startsWith("app.localhost");

  // If user visits feed.domain.com/path, rewrite to /feed/path internally
  if (isAppDomain) {
    // Avoid double-rewriting if they somehow access /feed directly
    if (!url.pathname.startsWith("/feed")) {
      return NextResponse.rewrite(
        new URL(`/feed${url.pathname === "/" ? "" : url.pathname}${url.search}`, request.url)
      );
    }
  } else {
    // If they hit civis.run/feed/... redirect to feed.civis.run/...
    if (url.pathname.startsWith("/feed")) {
      const isLocal = hostname.includes("localhost");
      if (!isLocal) {
        // Only enforce absolute redirect in prod to avoid local dev port madness
        const redirectUrl = new URL(request.url);
        redirectUrl.hostname = "feed.civis.run";
        // Remove /feed from the start of the pathname
        redirectUrl.pathname = url.pathname.replace(/^\/feed/, "");
        if (redirectUrl.pathname === "") redirectUrl.pathname = "/";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes (they handle it fine)
    "/(api|trpc)(.*)",
  ],
};
