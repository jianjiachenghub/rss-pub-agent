import dayjs from "dayjs";
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
  const leadIssue = dailyIssues[0];
  const headerMeta = [
    leadIssue ? dayjs(leadIssue.date).format("YYYY.MM.DD") : null,
    dailyIssues.length > 0 ? `${dailyIssues.length} 期日更` : null,
    weeklyIssues.length > 0 ? `${weeklyIssues.length} 期周度综览` : null,
    timelineDays.length > 0 ? `${timelineDays.length} 天时间线` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      header={{
        section: "首页",
        title: leadIssue ? "最新资讯" : "资讯归档",
        meta: headerMeta,
      }}
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
          <p className="mt-5 max-w-3xl text-base leading-8 text-black/65">
            首页会自动读取共享内容目录下的每日内容，并生成首页、周度综览和时间线视图。
          </p>
        </section>
      )}
    </PublicationShell>
  );
}
