import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Exclude docs routes from subdomain logic
  if (url.pathname.startsWith('/docs')) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "";

  // The domains we want to treat as the "app" domain
  const isAppDomain =
    hostname === "app.civis.run" ||
    hostname.startsWith("app.localhost");

  // If user visits app.civis.run/path, rewrite to /feed/path internally
  if (isAppDomain) {
    // Alpha gate: require password cookie for app subdomain
    const alphaPassword = process.env.ALPHA_PASSWORD;
    if (alphaPassword) {
      const isGatePage = url.pathname === "/feed/alpha-gate" || url.pathname.startsWith("/feed/alpha-gate");
      const isGateApi = url.pathname === "/api/alpha-gate";
      const isApiRoute = url.pathname.startsWith("/api");
      const hasAccess = request.cookies.get("alpha_gate")?.value === alphaPassword;

      if (!hasAccess && !isGatePage && !isGateApi && !isApiRoute) {
        return NextResponse.rewrite(
          new URL(`/feed/alpha-gate?redirect=${encodeURIComponent(url.pathname)}`, request.url)
        );
      }
    }

    // Don't rewrite API routes — they live at /api/*, not /feed/api/*
    if (url.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // Avoid double-rewriting if they somehow access /feed directly
    if (!url.pathname.startsWith("/feed")) {
      return NextResponse.rewrite(
        new URL(`/feed${url.pathname === "/" ? "" : url.pathname}${url.search}`, request.url)
      );
    }
  } else {
    // If they hit civis.run/feed/... redirect to app.civis.run/...
    if (url.pathname.startsWith("/feed")) {
      const isLocal = hostname.includes("localhost");
      if (!isLocal) {
        // Only enforce absolute redirect in prod to avoid local dev port madness
        const redirectUrl = new URL(request.url);
        redirectUrl.hostname = "app.civis.run";
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
    // Skip Next.js internals, Sentry tunnel, and all static files
    "/((?!monitoring|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes (they handle it fine)
    "/(api|trpc)(.*)",
  ],
};
