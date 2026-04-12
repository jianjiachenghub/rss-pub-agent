import Link from "next/link";
import dayjs from "dayjs";
import type { WeeklyIssue } from "@/lib/content-loader";
import ResilientImage from "@/components/ResilientImage";
import { getCategoryDisplayLabel } from "@/lib/display-text";
import type { SiteLocale } from "@/lib/locale";
import { withLocalePath } from "@/lib/locale";

function buildWeeklyNote(issue: WeeklyIssue, locale: SiteLocale): string {
  const themes = issue.categories
    .slice(0, 3)
    .map((category) => getCategoryDisplayLabel(category, locale))
    .join(" / ");

  if (locale === "en") {
    const issueLabel = `${issue.issueCount} daily issues`;
    const storyLabel = `${issue.itemCount} stories`;

    if (!themes) {
      return `This weekly digest is compiled from the archived daily issues and covers ${issueLabel} and ${storyLabel}.`;
    }

    return `This weekly digest rolls up ${issueLabel} and ${storyLabel}. Repeating themes this week include ${themes}, and you can jump back into each individual day below.`;
  }

  const issueLabel = `${issue.issueCount} 份日报`;
  const storyLabel = `${issue.itemCount} 条资讯`;

  if (!themes) {
    return `这份周报基于现有归档日报整理而成，覆盖了 ${issueLabel} 和 ${storyLabel}。`;
  }

  return `这份周报整理了 ${issueLabel} 和 ${storyLabel}。本周反复出现的主题包括 ${themes}，下方可以继续跳回每一天的原始内容。`;
}

export default function WeeklyDigest({
  locale,
  issue,
}: {
  locale: SiteLocale;
  issue: WeeklyIssue;
}) {
  const copy =
    locale === "en"
      ? {
          hero: "This Week",
          dailyCount: "Daily issues",
          storyCount: "Stories",
          avgScore: "Avg score",
          highlightCount: "Highlights",
          highlights: "Highlights",
          archiveNote: "Archive note",
          dailyContent: "Daily issues",
          focus: "Highlight",
          itemSuffix: "stories",
        }
      : {
          hero: "本周周报",
          dailyCount: "日更数",
          storyCount: "资讯数",
          avgScore: "均分",
          highlightCount: "重点数",
          highlights: "本周重点",
          archiveNote: "归档说明",
          dailyContent: "每日内容",
          focus: "重点",
          itemSuffix: "条资讯",
        };

  return (
    <article className="space-y-10">
      <section className="editorial-card hero-card p-6 md:p-8">
        <div className="section-label">{copy.hero}</div>
        <div className="mt-8 space-y-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/60">
            {issue.rangeLabel}
          </div>
          <h1 className="display-title display-title-compact max-w-4xl">
            {issue.label}
          </h1>
          <p className="max-w-4xl text-lg leading-9 text-black/78">
            {issue.summary || buildWeeklyNote(issue, locale)}
          </p>
          <div className="flex flex-wrap gap-3">
            {issue.categories.map((category) => (
              <span key={category} className="outline-chip">
                {getCategoryDisplayLabel(category, locale)}
              </span>
            ))}
          </div>
          <ResilientImage
            alt={issue.label}
            className="hero-media h-[24rem] w-full object-cover"
            fallback="hide"
            src={issue.heroImageUrl}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="metric-card">
          <div className="metric-value">{issue.issueCount}</div>
          <div className="metric-label">{copy.dailyCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{issue.itemCount}</div>
          <div className="metric-label">{copy.storyCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{issue.avgScore}</div>
          <div className="metric-label">{copy.avgScore}</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{issue.keyTitles.length}</div>
          <div className="metric-label">{copy.highlightCount}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">{copy.highlights}</div>
          <div className="mt-7 space-y-4">
            {issue.keyTitles.map((title, index) => (
              <div key={`${title}-${index}`} className="border-t border-black/10 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/46">
                  {copy.focus} {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-lg font-semibold leading-snug text-black">
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editorial-card p-6 md:p-8">
          <div className="section-label">{copy.archiveNote}</div>
          <p className="mt-7 text-sm leading-8 text-black/74">
            {buildWeeklyNote(issue, locale)}
          </p>
        </div>
      </section>

      <section className="editorial-card p-6 md:p-8">
        <div className="section-label">{copy.dailyContent}</div>
        <div className="mt-8 space-y-5">
          {issue.days.map((day) => (
            <Link
              key={day.date}
              href={withLocalePath(locale, `/${day.date}`)}
              className="weekly-day-entry grid gap-5 border-t border-black/10 pt-5 md:grid-cols-[9rem_minmax(0,1fr)]"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/58">
                <div>{dayjs(day.date).format("YYYY.MM.DD")}</div>
                <div className="mt-2">
                  {day.meta?.itemCount ?? 0} {copy.itemSuffix}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-semibold leading-tight text-black">
                  <span className="hover-underline">{day.title}</span>
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-black/74">{day.summary}</p>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {day.keyTitles.slice(0, 4).map((title, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className="border-t border-black/10 pt-3 text-sm leading-6 text-black/76"
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
