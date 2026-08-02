import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Posy — text one line, we handle the whole gift",
  description:
    "Posy is an agentic gifting concierge you text. An OpenAI agent picks and sends the perfect gift, paying with one-time Visa network tokens via Prava — inside your spend guardrails.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
