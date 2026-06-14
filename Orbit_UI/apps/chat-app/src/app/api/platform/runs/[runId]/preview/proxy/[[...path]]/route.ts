import { type NextRequest, NextResponse } from "next/server";

const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamUrl(runId: string, pathSegments: string[] | undefined, search: string) {
  const subpath = pathSegments?.filter(Boolean).join("/") ?? "";
  const base = `${apiProxy}/api/platform/runs/${runId}/preview/proxy`;
  const path = subpath ? `${base}/${subpath}` : base;
  return search ? `${path}${search}` : path;
}

async function proxyPreviewRequest(
  req: NextRequest,
  runId: string,
  pathSegments: string[] | undefined,
) {
  const cookie = req.headers.get("cookie") ?? "";
  const upstreamUrl = buildUpstreamUrl(runId, pathSegments, req.nextUrl.search);

  const headers: Record<string, string> = {
    Accept: req.headers.get("accept") ?? "*/*",
  };
  if (cookie) headers.Cookie = cookie;

  const body =
    req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Cache-Control", "no-cache, no-transform");
  // Allow generated previews to load CSS/JS and embed in the platform iframe.
  responseHeaders.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  );
  responseHeaders.set("X-Frame-Options", "SAMEORIGIN");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ runId: string; path?: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { runId, path } = await context.params;
  return proxyPreviewRequest(req, runId, path);
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const { runId, path } = await context.params;
  return proxyPreviewRequest(req, runId, path);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { runId, path } = await context.params;
  return proxyPreviewRequest(req, runId, path);
}
