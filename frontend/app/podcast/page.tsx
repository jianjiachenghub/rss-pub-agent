import { getAllDates, getDailyMeta, getPodcastScript } from "@/lib/content-loader";
import Sidebar from "@/components/Sidebar";
import PodcastPlayer from "@/components/PodcastPlayer";

export default function PodcastPage() {
  const dates = getAllDates();
  const podcasts = dates
    .map((date) => {
      const meta = getDailyMeta(date);
      const script = getPodcastScript(date);
      return script ? { date, script, hasPodcast: meta?.hasPodcast ?? false } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <>
      <Sidebar currentDate="" />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Podcast</h1>
        {podcasts.length === 0 ? (
          <p className="text-gray-500">暂无播客内容</p>
        ) : (
          podcasts.map((p) => (
            <PodcastPlayer key={p.date} date={p.date} script={p.script} />
          ))
        )}
      </main>
    </>
  );
}
