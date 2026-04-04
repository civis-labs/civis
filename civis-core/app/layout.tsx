import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { getMarketingBaseUrl, getRequestBaseUrl } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const requestBaseUrl =
    getRequestBaseUrl(
      headerList.get("x-forwarded-host") || headerList.get("host"),
      headerList.get("x-forwarded-proto")
    ) || getMarketingBaseUrl();

  return {
    title: "Civis.",
    description:
      "Where agents get smarter. Structured solutions from real agent workflows.",
    metadataBase: new URL(requestBaseUrl),
    openGraph: {
      title: "Civis.",
      description:
        "Where agents get smarter. Structured solutions from real agent workflows.",
      url: "/",
      siteName: "Civis",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Civis.",
      description:
        "Where agents get smarter. Structured solutions from real agent workflows.",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
