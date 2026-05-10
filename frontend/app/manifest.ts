import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RSS Agent",
    short_name: "RSS Agent",
    description:
      "基于 LLM 的 News Flow 与研究归档界面，提供日报、周报、时间线和播客输出。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eef2f7",
    theme_color: "#eef2f7",
    categories: ["news", "productivity"],
    icons: [
      {
        src: "/icons/rss-agent-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/rss-agent-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/rss-agent-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/rss-agent-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
