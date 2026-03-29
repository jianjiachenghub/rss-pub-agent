import HomeTabs from "@/components/HomeTabs";
import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";

export default function HomePage() {
  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const timelineDays = getTimelineDays(14);

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      activeNav="home"
      weeklyIssues={weeklyIssues}
    >
      {dailyIssues.length > 0 ? (
        <HomeTabs
          dailyIssues={dailyIssues}
          timelineDays={timelineDays}
          weeklyIssues={weeklyIssues}
        />
      ) : (
        <section className="editorial-card px-6 py-14 md:px-10">
          <div className="section-label">暂无内容</div>
          <h1 className="display-title mt-8">先运行一次流水线，归档内容才会出现在这里。</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-black/72">
            首页会自动读取共享内容目录下的每日日报，并生成日报入口、周报入口和按天时间线。
          </p>
        </section>
      )}
    </PublicationShell>
  );
}
