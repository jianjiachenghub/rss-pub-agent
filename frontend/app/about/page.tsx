import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";
import {
  PROJECT_ABOUT_PARAGRAPHS,
  PROJECT_FLOW_LABEL,
  PROJECT_VALUE_LABEL,
  SITE_REPO_URL,
  SITE_SLOGAN,
} from "@/lib/site";

export default function AboutPage() {
  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const timelineDays = getTimelineDays(14);

  return (
    <PublicationShell
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      activeNav="about"
      weeklyIssues={weeklyIssues}
    >
      <article className="space-y-8">
        <section className="editorial-card hero-card p-6 md:p-8">
          <div className="page-intro">
            <div className="page-kicker">项目说明</div>
            <h1 className="page-title">这套系统如何把新闻变成判断</h1>
            <div className="page-meta-row">
              <span className="page-meta-pill">{SITE_SLOGAN}</span>
              <span className="page-meta-pill">{dailyIssues.length} 份日报</span>
              <span className="page-meta-pill">{weeklyIssues.length} 份周报</span>
              <span className="page-meta-pill">{timelineDays.length} 天时间线</span>
            </div>
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="space-y-4">
              {PROJECT_ABOUT_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-black/78">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="editorial-card p-5">
              <div className="section-label">源码入口</div>
              <p className="mt-5 text-sm leading-7 text-black/74">
                如果你要看完整实现、流水线脚本和部署配置，可以直接从 GitHub 仓库进入源码。
              </p>
              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="action-chip mt-6"
              >
                打开 GitHub 仓库
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="editorial-card p-6 md:p-8">
            <div className="section-label">运行逻辑</div>
            <p className="mt-7 text-base leading-8 text-black/78">{PROJECT_FLOW_LABEL}</p>
          </section>

          <section className="editorial-card p-6 md:p-8">
            <div className="section-label">项目价值</div>
            <p className="mt-7 text-base leading-8 text-black/78">{PROJECT_VALUE_LABEL}</p>
          </section>
        </section>
      </article>
    </PublicationShell>
  );
}
