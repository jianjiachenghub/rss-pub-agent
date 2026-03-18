import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 日报 - 更准、更快、更有用",
  description: "高效降噪 · 深度解读 · 实战导向 -- LLM 驱动的 AI 资讯精选",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="flex min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
