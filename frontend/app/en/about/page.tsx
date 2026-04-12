import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";
import { getProjectGuideData } from "@/lib/project-guide";
import { SITE_REPO_URL } from "@/lib/site";

export default function EnglishAboutPage() {
  const dailyIssues = getAllDailyIssues("en");
  const weeklyIssues = getWeeklyIssues("en");
  const timelineDays = getTimelineDays(14, "en");
  const guide = getProjectGuideData();

  return (
    <PublicationShell
      locale="en"
      currentDate={dailyIssues[0]?.date}
      dailyIssues={dailyIssues}
      activeNav="about"
      weeklyIssues={weeklyIssues}
    >
      <article className="space-y-8">
        <section className="editorial-card hero-card p-6 md:p-8">
          <div className="page-intro">
            <div className="page-kicker">About</div>
            <h1 className="page-title">How this project turns news into judgment</h1>
            <div className="page-meta-row">
              <span className="page-meta-pill">{dailyIssues.length} daily issues</span>
              <span className="page-meta-pill">{weeklyIssues.length} weekly digests</span>
              <span className="page-meta-pill">{timelineDays.length} timeline days</span>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            {guide.metrics.map((metric) => (
              <div key={metric.label} className="metric-card">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-label">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
            <div className="space-y-4">
              <p className="about-body-copy">
                RSS Agent is not a generic news site. It is an LLM-driven editorial
                pipeline that fetches from known sources, filters noise, scores
                signal strength, and turns the result into daily issues, weekly
                digests, podcast scripts, and distribution-ready summaries.
              </p>
              <p className="about-body-copy">
                The point is not to show more information. The point is to compress
                noisy inputs into stable editorial judgment that can be revisited
                over time.
              </p>
            </div>

            <div className="editorial-card about-side-card p-5">
              <div className="section-label">Project summary</div>
              <p className="about-summary-copy mt-5">
                Primary flow: fetch, editorial filtering, scoring, insight
                generation, then daily and weekly publication.
              </p>

              <div className="about-side-list">
                <div className="about-inline-item">
                  <span className="about-inline-label">Primary source model</span>
                  <span className="about-inline-value">
                    {guide.primarySource?.name ?? "Configured feeds"}
                  </span>
                </div>
                <div className="about-inline-item">
                  <span className="about-inline-label">Tiered feed system</span>
                  <span className="about-inline-value">
                    Core {guide.tierCounts.core} / Signal {guide.tierCounts.signal} / Watch{" "}
                    {guide.tierCounts.watch}
                  </span>
                </div>
              </div>

              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="action-chip mt-6"
              >
                Open the GitHub repository
              </a>
            </div>
          </div>
        </section>

        <section className="editorial-card p-6 md:p-8">
          <div className="section-label">Pipeline</div>
          <p className="about-section-lead">
            The current pipeline runs as: fetch → pre-filter → editorial agenda →
            gate-keep → score → insight → daily issue → publish.
          </p>

          <div className="about-stage-grid">
            <section className="about-stage-card">
              <div className="about-stage-index">01</div>
              <h2 className="about-stage-title">Controlled source intake</h2>
              <p className="about-stage-copy">
                Inputs come from explicit feed configuration rather than ad-hoc
                discovery, which keeps the archive auditable.
              </p>
            </section>
            <section className="about-stage-card">
              <div className="about-stage-index">02</div>
              <h2 className="about-stage-title">Editorial filtering</h2>
              <p className="about-stage-copy">
                Duplicate stories and weak signals are compressed before the final
                scoring step, so daily issues are shaped by judgment rather than raw
                volume.
              </p>
            </section>
            <section className="about-stage-card">
              <div className="about-stage-index">03</div>
              <h2 className="about-stage-title">Structured outputs</h2>
              <p className="about-stage-copy">
                Daily Markdown, weekly views, podcast scripts, and distribution
                summaries all come from the same pipeline state.
              </p>
            </section>
            <section className="about-stage-card">
              <div className="about-stage-index">04</div>
              <h2 className="about-stage-title">Archive-first frontend</h2>
              <p className="about-stage-copy">
                The frontend reads generated artifacts directly from the content
                archive instead of re-interpreting the source data at render time.
              </p>
            </section>
          </div>
        </section>
      </article>
    </PublicationShell>
  );
}
