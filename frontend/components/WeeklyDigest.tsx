import Link from "next/link";
import dayjs from "dayjs";
import type { WeeklyIssue } from "@/lib/content-loader";

function buildWeeklyNote(issue: WeeklyIssue): string {
  const themes = issue.categories.slice(0, 3).join(" / ");
  const issueLabel = `${issue.issueCount} 期日更`;
  const storyLabel = `${issue.itemCount} 条资讯`;

  if (!themes) {
    return `这份周度综览基于现有归档内容整理而成，覆盖了 ${issueLabel} 和 ${storyLabel}。`;
  }

  return `这份周度综览整理了 ${issueLabel} 和 ${storyLabel}。本周反复出现的主题包括 ${themes}，下方可以继续跳回每天的原始内容。`;
}

export default function WeeklyDigest({ issue }: { issue: WeeklyIssue }) {
  return (
    <article className="space-y-10">
      <section className="editorial-card hero-card p-6 md:p-8">
        <div className="section-label">本周综览</div>
        <div className="mt-8 space-y-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-black/45">
            {issue.rangeLabel}
          </div>
          <h1 className="display-title max-w-4xl">{issue.label}</h1>
          <p className="max-w-4xl text-lg leading-9 text-black/68">
            {issue.summary || buildWeeklyNote(issue)}
          </p>
          <div className="flex flex-wrap gap-3">
            {issue.categories.map((category) => (
              <span key={category} className="outline-chip">
                {category}
              </span>
            ))}
          </div>
          {issue.heroImageUrl ? (
            <img
              alt={issue.label}
              className="hero-media h-[24rem] w-full object-cover"
              src={issue.heroImageUrl}
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="metric-card">
          <div className="metric-value">{issue.issueCount}</div>
          <div className="metric-label">日更数</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{issue.itemCount}</div>
          <div className="metric-label">资讯数</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{issue.avgScore}</div>
          <div className="metric-label">均分</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{issue.keyTitles.length}</div>
          <div className="metric-label">重点数</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">本周重点</div>
          <div className="mt-7 space-y-4">
            {issue.keyTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="border-t border-black/10 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/35">
                  重点 {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-lg font-semibold leading-snug text-black">
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">归档说明</div>
          <p className="mt-7 text-sm leading-8 text-black/64">{buildWeeklyNote(issue)}</p>
        </div>
      </section>

      <section className="editorial-card p-6 md:p-8">
        <div className="section-label">每日内容</div>
        <div className="mt-8 space-y-5">
          {issue.days.map((day) => (
            <Link
              key={day.date}
              href={`/${day.date}`}
              className="interactive-panel surface-link grid gap-5 border-t border-black/10 pt-5 md:grid-cols-[9rem_minmax(0,1fr)]"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-black/42">
                <div>{dayjs(day.date).format("YYYY.MM.DD")}</div>
                <div className="mt-2">{day.meta?.itemCount ?? 0} 条资讯</div>
              </div>
              <div>
                <h2 className="text-2xl font-semibold leading-tight text-black">
                  <span className="hover-underline">{day.title}</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-black/65">
                  {day.summary}
                </p>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {day.keyTitles.slice(0, 4).map((title, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className="border-t border-black/10 pt-3 text-sm leading-6 text-black/68"
                    >
                      {title}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
