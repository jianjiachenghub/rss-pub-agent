import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Pause, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { fetchPodcast } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/podcast/$date")({
  component: PodcastDetailComponent,
  loader: ({ params }) => {
    return { date: params.date };
  },
});

function PodcastDetailComponent() {
  const loaderData = Route.useLoaderData();
  const date = loaderData?.date || "";
  
  const { data: podcast, isLoading } = useQuery({
    queryKey: ["podcast", date],
    queryFn: () => fetchPodcast(date),
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          setProgress(
            (audioRef.current.currentTime / audioRef.current.duration) * 100
          );
        }
      });
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/$date"
        params={{ date }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回日报
      </Link>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        {formatDate(date)}
      </div>

      <h1 className="text-2xl font-bold">AI 日报播客</h1>

      <div className="p-6 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </button>

          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{formatTime((progress / 100) * (podcast?.duration || 0))}</span>
              <span>{formatTime(podcast?.duration || 0)}</span>
            </div>
          </div>
        </div>

        {podcast?.audioUrl && (
          <audio ref={audioRef} src={podcast.audioUrl} className="hidden" />
        )}
      </div>

      <p className="text-muted-foreground">
        今日 AI 资讯语音播报，由 AI 生成
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
