import { type NextRequest } from "next/server";

const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

/** Proxy Clovops agent SSE without buffering (Next rewrites abort long streams). */
export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(
    `${apiProxy}/api/apps/code-workspace/projects/${encodeURIComponent(projectId)}/agent/search/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body,
    },
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
