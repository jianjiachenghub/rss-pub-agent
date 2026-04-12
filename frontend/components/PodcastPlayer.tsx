"use client";

import { useState } from "react";
import type { SiteLocale } from "@/lib/locale";

interface Props {
  date: string;
  audioUrl?: string;
  script: string;
  locale?: SiteLocale;
}

export default function PodcastPlayer({
  date,
  audioUrl,
  script,
  locale = "zh",
}: Props) {
  const [showScript, setShowScript] = useState(false);

  return (
    <article className="editorial-card interactive-panel px-5 py-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/58">
        {date}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {audioUrl ? (
          <audio controls className="w-full max-w-xl" src={audioUrl} />
        ) : (
          <span className="outline-chip">{locale === "en" ? "Script only" : "仅脚本"}</span>
        )}
        <button
          type="button"
          onClick={() => setShowScript((value) => !value)}
          className="action-chip"
        >
          {showScript
            ? locale === "en"
              ? "Hide script"
              : "收起脚本"
            : locale === "en"
              ? "Show script"
              : "查看脚本"}
        </button>
      </div>
      {showScript ? (
        <pre className="mt-5 overflow-x-auto border border-black/10 bg-[#111] px-4 py-4 whitespace-pre-wrap text-sm leading-7 text-[#f8f6ef]">
          {script}
        </pre>
      ) : null}
    </article>
  );
}
