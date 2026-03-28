import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Noto_Sans_SC,
  Outfit,
} from "next/font/google";
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
  title: "AI News Flow | 新闻日报系统",
  description: "面向中文用户的新闻日报系统，提供每日内容、周度综览和时间线视图。",
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
