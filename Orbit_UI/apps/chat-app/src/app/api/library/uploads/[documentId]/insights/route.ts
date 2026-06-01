import { type NextRequest, NextResponse } from "next/server";

const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:8000";
const INSIGHTS_PROXY_TIMEOUT_MS = 5 * 60 * 1000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

/** Proxy insight generation with a longer timeout than the default dev rewrite. */
export async function POST(req: NextRequest, context: RouteContext) {
  const { documentId } = await context.params;
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";

  try {
    const upstream = await fetch(`${apiProxy}/api/library/uploads/${documentId}/insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body || "{}",
      signal: AbortSignal.timeout(INSIGHTS_PROXY_TIMEOUT_MS),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Insight generation timed out. Try again with fewer insight types."
        : "Insight generation failed before the server responded. Please try again.";
    return NextResponse.json({ detail: message }, { status: 504 });
  }
}
