import { createFileRoute } from "@tanstack/react-router";
import { Radio, Play, Pause } from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/podcast")({
  component: PodcastComponent,
});

// Mock data - 实际应从 API 获取
const mockPodcasts = [
  { date: "2026-03-22", title: "AI 日报播客 - 3月22日", duration: "5:32" },
  { date: "2026-03-21", title: "AI 日报播客 - 3月21日", duration: "4:18" },
  { date: "2026-03-20", title: "AI 日报播客 - 3月20日", duration: "6:05" },
];

function PodcastComponent() {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = (date: string) => {
    if (playing === date) {
      setPlaying(null);
      audioRef.current?.pause();
    } else {
      setPlaying(date);
      // 实际应加载对应音频
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="h-6 w-6" />
        <h1 className="text-2xl font-bold">AI 日报播客</h1>
      </div>

      <p className="text-muted-foreground">
        每日 AI 资讯语音播报，通勤路上也能了解行业动态
      </p>

      <div className="space-y-3">
        {mockPodcasts.map((podcast) => (
          <div
            key={podcast.date}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <h3 className="font-medium">{podcast.title}</h3>
              <p className="text-sm text-muted-foreground">
                {podcast.date} · {podcast.duration}
              </p>
            </div>
            <button
              onClick={() => togglePlay(podcast.date)}
              className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {playing === podcast.date ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
