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
          backgroundColor: "#0a0a0a",
          fontFamily: "Geist",
          position: "relative",
          overflow: "hidden",
        }}
      >
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

        {/* Civis + dot using relative positioning */}
        <div
          style={{
            position: "relative",
            display: "flex",
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
          {/* Cyan dot positioned absolutely to bottom-right */}
          <div
            style={{
              position: "absolute",
              right: "-30px",
              bottom: "2px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "#22d3ee",
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
