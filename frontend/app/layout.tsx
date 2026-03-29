import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_SC, Outfit } from "next/font/google";
import "./globals.css";

const displayFont = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RSS Agent | 基于 LLM 的 News Flow",
  description:
    "RSS Agent 是一个基于 LLM 的 News Flow 与研究归档界面，提供日报、周报、时间线和播客输出。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen bg-[var(--paper)] text-stone-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
