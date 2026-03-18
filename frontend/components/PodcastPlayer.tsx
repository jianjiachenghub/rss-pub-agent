"use client";

import { useRef, useState } from "react";

interface Props {
  date: string;
  audioUrl?: string;
  script: string;
}

export default function PodcastPlayer({ date, audioUrl, script }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showScript, setShowScript] = useState(false);

  return (
    <div className="border rounded-xl p-6 mb-4 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-2">{date}</h3>
      {audioUrl ? (
        <audio ref={audioRef} controls className="w-full mb-3" src={audioUrl} />
      ) : (
        <p className="text-sm text-gray-400 mb-3">音频生成中...</p>
      )}
      <button
        onClick={() => setShowScript(!showScript)}
        className="text-sm text-indigo-500 hover:underline"
      >
        {showScript ? "收起脚本" : "查看脚本"}
      </button>
      {showScript && (
        <pre className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm whitespace-pre-wrap">
          {script}
        </pre>
      )}
    </div>
  );
}
