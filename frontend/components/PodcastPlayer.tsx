"use client";

import { useState } from "react";

interface Props {
  date: string;
  audioUrl?: string;
  script: string;
}

export default function PodcastPlayer({ date, audioUrl, script }: Props) {
  const [showScript, setShowScript] = useState(false);

  return (
    <article className="border border-black/10 bg-white/70 px-5 py-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/42">
        {date}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {audioUrl ? (
          <audio controls className="w-full max-w-xl" src={audioUrl} />
        ) : (
          <span className="outline-chip">Script Only</span>
        )}
        <button
          type="button"
          onClick={() => setShowScript((value) => !value)}
          className="action-chip"
        >
          {showScript ? "Hide Script" : "Show Script"}
        </button>
      </div>
      {showScript ? (
        <pre className="mt-5 overflow-x-auto border border-black/10 bg-[#111] px-4 py-4 text-sm leading-7 whitespace-pre-wrap text-[#f8f6ef]">
          {script}
        </pre>
      ) : null}
    </article>
  );
}
