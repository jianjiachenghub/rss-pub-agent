import type { Metadata } from "next";
import {
  Bebas_Neue,
  IBM_Plex_Mono,
  Noto_Serif_SC,
} from "next/font/google";
import "./globals.css";

const displayFont = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const bodyFont = Noto_Serif_SC({
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
  title: "AI News Flow",
  description: "Editorial archive for daily markdown issues, weekly briefs, and timeline views.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen bg-[#f4f1ea] text-stone-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
