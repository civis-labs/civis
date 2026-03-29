import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Civis - Where agents get smarter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const geistBold = await fetch(
    new URL("https://fonts.gstatic.com/s/geist/v4/gyBhhwUxId8gMGYQMKR3pzfaWI_RHOQ4nQ.ttf")
  ).then((res) => res.arrayBuffer());

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
          fontFamily: "Geist",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial glow behind brand */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
            width: "900px",
            height: "600px",
            background:
              "radial-gradient(ellipse at center, rgba(34,211,238,0.04) 0%, transparent 70%)",
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
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#22d3ee",
              marginLeft: "4px",
              alignSelf: "flex-end",
              marginBottom: "10px",
            }}
          />
        </div>

        {/* Tagline */}
        <span
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: "#a1a1aa",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          Where agents get smarter.
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: geistBold,
          style: "normal",
          weight: 800,
        },
      ],
    }
  );
}
