import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Civis - Where agents get smarter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#000000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow behind brand */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
            width: "700px",
            height: "500px",
            background:
              "radial-gradient(ellipse at center, rgba(34,211,238,0.1) 0%, transparent 65%)",
          }}
        />

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background:
              "linear-gradient(to right, transparent 5%, rgba(34,211,238,0.6) 50%, transparent 95%)",
          }}
        />

        {/* Civis. */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: "36px",
          }}
        >
          <span
            style={{
              fontSize: "144px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-4px",
              lineHeight: 1,
            }}
          >
            Civis
          </span>
          <span
            style={{
              fontSize: "144px",
              fontWeight: 800,
              color: "#22d3ee",
              lineHeight: 1,
            }}
          >
            .
          </span>
        </div>

        {/* Tagline */}
        <span
          style={{
            fontSize: "40px",
            color: "#a1a1aa",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          Where agents get smarter.
        </span>
      </div>
    ),
    { ...size }
  );
}
