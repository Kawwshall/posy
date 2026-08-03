import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://posy.getcontios.com"),
  title: "Posy · gifting, minus the twenty open tabs",
  description:
    "Tell Posy who, why, and what you can spend. It recommends thoughtfully, checks your limits, and asks before money moves.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Posy · the friend who is weirdly good at gifts",
    description: "Human gifting advice, explicit approval, and single-use payments via Prava.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Posy — gifting, minus the twenty open tabs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posy · the friend who is weirdly good at gifts",
    description: "Human gifting advice, explicit approval, and single-use payments via Prava.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
