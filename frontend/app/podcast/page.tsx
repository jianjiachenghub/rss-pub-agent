import dayjs from "dayjs";
import PodcastPlayer from "@/components/PodcastPlayer";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getAllDates,
  getDailyMeta,
  getPodcastScript,
  getWeeklyIssues,
} from "@/lib/content-loader";

export default function PodcastPage() {
  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const podcasts = getAllDates()
    .map((date) => {
      const meta = getDailyMeta(date);
      const script = getPodcastScript(date);
      return script ? { date, script, hasPodcast: meta?.hasPodcast ?? false } : null;
    })
    .filter((podcast): podcast is NonNullable<typeof podcast> => podcast !== null);
  const latestPodcastDate = podcasts[0]?.date;
  const headerMeta = [
    latestPodcastDate ? `最新脚本 ${dayjs(latestPodcastDate).format("YYYY.MM.DD")}` : null,
    podcasts.length > 0 ? `${podcasts.length} 份脚本` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      activeNav="podcast"
      header={{
        section: "播客存档",
        title: podcasts.length > 0 ? "播客脚本回看" : "暂无播客脚本",
        meta: headerMeta,
      }}
      weeklyIssues={weeklyIssues}
    >
      <section className="editorial-card hero-card p-6 md:p-8">
        <div className="section-label">播客存档</div>
        <div className="mt-8 space-y-4">
          {podcasts.length === 0 ? (
            <p className="text-sm leading-7 text-black/72">暂时还没有可播放的播客脚本。</p>
          ) : (
            podcasts.map((podcast) => (
              <PodcastPlayer key={podcast.date} date={podcast.date} script={podcast.script} />
            ))
          )}
        </div>
      </section>
    </PublicationShell>
  );
}
