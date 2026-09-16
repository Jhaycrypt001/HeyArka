import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/*
 * DESIGN.md specifies Aeonik (commercial) with Inter named as the substitute,
 * and a mono companion with JetBrains Mono named as the substitute. Both are
 * loaded through next/font, which self-hosts the files at build time — no
 * external CDN request at runtime, and no layout shift.
 */
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-stack",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono-stack",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HeyArka: Adversarial evaluation for LLM trading agents",
  description:
    "Every LLM trading agent can be hijacked by a character you can't see. HeyArka proves it, scores it, and hardens it, in one command.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
