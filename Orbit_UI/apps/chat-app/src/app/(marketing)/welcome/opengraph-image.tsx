import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@orbit/ui";

export const alt = `${BRAND_NAME} — AI Chat, Document Q&A & AI Apps`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: "80px",
          background: "linear-gradient(135deg, #eef2ff 0%, #ede9fe 45%, #fce7f3 100%)",
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
          <div style={{ fontSize: 30, fontWeight: 600, color: "#1f2937" }}>{BRAND_NAME}</div>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: 980,
          }}
        >
          The AI workspace that actually gets work done
        </div>
        <div style={{ fontSize: 32, color: "#475569", maxWidth: 900, lineHeight: 1.3 }}>
          Chat, document Q&A, and a catalog of focused AI apps — in one place.
        </div>
      </div>
    ),
    { ...size },
  );
}
