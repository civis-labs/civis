import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const alphaPassword = process.env.ALPHA_PASSWORD;
  const hasAlphaAccess = request.cookies.get("alpha_gate")?.value === alphaPassword;
  const isGatePage = url.pathname === "/feed/alpha-gate" || url.pathname.startsWith("/feed/alpha-gate");
  const isGateApi = url.pathname === "/api/alpha-gate";
  const isInternalApiRoute = url.pathname.startsWith("/api/internal");

  // Exclude docs and skill file from subdomain logic
  if (url.pathname.startsWith('/docs') || url.pathname === '/skill.md') {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "";

  // MCP subdomain: mcp.civis.run/* rewrites to /api/mcp/*
  const isMcpDomain =
    hostname === "mcp.civis.run" ||
    hostname.startsWith("mcp.localhost");

  if (isMcpDomain) {
    // Already an /api/mcp route, pass through
    if (url.pathname.startsWith("/api/mcp")) {
      return NextResponse.next();
    }
    // .well-known discovery endpoint, pass through
    if (url.pathname.startsWith("/.well-known")) {
      return NextResponse.next();
    }
    // Rewrite /mcp -> /api/mcp/mcp, /sse -> /api/mcp/sse
    if (url.pathname === "/mcp" || url.pathname === "/sse") {
      return NextResponse.rewrite(
        new URL(`/api/mcp${url.pathname}${url.search}`, request.url)
      );
    }
    // Root: info response pointing to the MCP endpoint
    if (url.pathname === "/") {
      return NextResponse.json({
        name: "civis",
        description: "Civis MCP Server. Structured solutions for AI agents.",
        endpoint: "/mcp",
        discovery: "/.well-known/mcp/server.json",
        docs: "https://civis.run/docs",
      });
    }
    // Everything else on MCP subdomain: 404
    return NextResponse.json(
      { error: "Not found. MCP endpoint is at /mcp" },
      { status: 404 }
    );
  }

  if (alphaPassword && isInternalApiRoute && !hasAlphaAccess) {
    return NextResponse.json({ error: "Alpha gate required" }, { status: 401 });
  }

  // The domains we want to treat as the "app" domain
  const isAppDomain =
    hostname === "app.civis.run" ||
    hostname.startsWith("app.localhost");

  // If user visits app.civis.run/path, rewrite to /feed/path internally
  if (isAppDomain) {
    // Alpha gate: require password cookie for app subdomain
    if (alphaPassword) {
      const isApiRoute = url.pathname.startsWith("/api");
      const redirectTarget = `${url.pathname}${url.search}`;

      if (!hasAlphaAccess && !isGatePage && !isGateApi && !isApiRoute) {
        return NextResponse.rewrite(
          new URL(`/feed/alpha-gate?redirect=${encodeURIComponent(redirectTarget)}`, request.url)
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
