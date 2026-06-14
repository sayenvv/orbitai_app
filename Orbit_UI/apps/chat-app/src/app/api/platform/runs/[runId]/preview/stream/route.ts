import { type NextRequest } from "next/server";

const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy preview SSE without buffering (Next rewrites abort long streams). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(`${apiProxy}/api/platform/runs/${runId}/preview/stream`, {
    method: "GET",
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

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
