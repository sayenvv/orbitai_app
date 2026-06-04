import { ImageResponse } from "next/og";
import { findCatalogAppById, visibleAppsCatalog } from "@orbit/clovai-apps";
import { BRAND_NAME } from "@orbit/ui";

export const alt = "App preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return visibleAppsCatalog.map((app) => ({ id: app.id }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = findCatalogAppById(id);

  const name = app?.name ?? BRAND_NAME;
  const tagline = app?.tagline ?? "AI-powered chat, document library, and learning assistants";
  const category = app?.category ?? "AI Apps";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #eef2ff 0%, #ede9fe 45%, #fce7f3 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#0f172a",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {BRAND_NAME.charAt(0)}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#1f2937" }}>
            {BRAND_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              alignSelf: "flex-start",
              fontSize: 24,
              fontWeight: 600,
              color: "#6d28d9",
              background: "rgba(124,58,237,0.12)",
              padding: "8px 20px",
              borderRadius: 999,
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 34, color: "#475569", maxWidth: 920, lineHeight: 1.3 }}>
            {tagline}
          </div>
        </div>

        <div style={{ fontSize: 24, color: "#64748b" }}>
          {`${chatHost()} · Try it free`}
        </div>
      </div>
    ),
    { ...size },
  );
}

function chatHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").host;
  } catch {
    return "clovai.app";
  }
}
