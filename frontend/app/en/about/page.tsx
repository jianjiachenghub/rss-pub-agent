import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";
import { getProjectGuideData } from "@/lib/project-guide";
import { SITE_REPO_URL, SITE_SLOGAN_EN } from "@/lib/site";

const TIER_LABELS = {
  core: "Core",
  signal: "Signal",
  watch: "Watch",
} as const;

const METRIC_LABELS = [
  "Configured feeds",
  "Primary intake feeds",
  "Watch-only feeds",
  "Daily issue cap",
] as const;

const PROJECT_FLOW_LABEL =
  "Fetch -> Gate-Keep -> Score -> Insight -> Daily / Weekly / Podcast -> Publish";

const PROJECT_VALUE_LABEL =
  "Compress noisy inputs into actionable judgment, then keep high-value signals under continuous watch.";

const ABOUT_PARAGRAPHS = [
  "RSS Agent is not a generic news site. It is an LLM-driven editorial pipeline that starts from a Folo-led source stack plus multi-category RSS feeds, then moves through gate-keeping, scoring, and interpretation before it becomes a daily issue, weekly digest, podcast script, or platform summary.",
  "The value of the project is not that it shows you more information. The value is that it compresses noise into judgment, organizes fragmented signals into continuous observation, and leaves behind an archive you can revisit, compare, and act on.",
  "This is not a frontend shell that simply renders whatever it grabs. The system first de-duplicates, applies editorial judgment, scores signal quality, and structures the output. What you see on the homepage is the editorial result; what you open in a detail page is the generated Markdown artifact itself.",
] as const;

const SOURCE_GROUP_COPY: Record<string, { label: string; description: string }> = {
  ai: {
    label: "AI",
    description:
      "High-priority signals around model capability, product form factors, research progress, and industry direction.",
  },
  tech: {
    label: "Technology",
    description:
      "External shifts from major platforms, infrastructure, consumer tech, and large-company strategy.",
  },
  software: {
    label: "Software Engineering",
    description:
      "Developer tools, open source, frameworks, and changes in engineering productivity.",
  },
  business: {
    label: "Business",
    description:
      "Company strategy, earnings, market structure, and industry-chain changes worth tracking.",
  },
  investment: {
    label: "Investment",
    description:
      "Capital flows, risk appetite, market pricing, and fast-moving macro-financial signals.",
  },
  politics: {
    label: "Policy",
    description:
      "Regulation, geopolitics, export controls, and structural policy variables.",
  },
  social: {
    label: "Social",
    description:
      "Trending topics and public discussion used as a watch layer, not as the main editorial driver.",
  },
};

const SCORE_DIMENSION_COPY: Record<string, { label: string; description: string }> = {
  signalStrength: {
    label: "Signal Strength",
    description:
      "Whether the item actually changes your view of where an industry, market, or platform is moving.",
  },
  futureImpact: {
    label: "Future Impact",
    description:
      "Whether it is likely to matter over the next few days or weeks, instead of being only today's noise.",
  },
  personalRelevance: {
    label: "Personal Relevance",
    description:
      "How directly it connects to the core tracking surface: AI, products, engineering, and investment.",
  },
  decisionUsefulness: {
    label: "Decision Usefulness",
    description:
      "Whether it helps the next action: follow-up tracking, hypothesis building, or judgment revision.",
  },
  credibility: {
    label: "Credibility",
    description:
      "The quality, completeness, and verifiability of the source material behind the item.",
  },
  timeliness: {
    label: "Timeliness",
    description:
      "Its urgency within the last 24 hours and whether it deserves space in the current daily issue.",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI",
  tech: "Technology",
  software: "Software Engineering",
  business: "Business",
  investment: "Investment",
  politics: "Policy",
  social: "Social",
};

const PRIMARY_SOURCE_HIGHLIGHTS = [
  "It sits at the front of the discovery chain and plays the role of find first, verify next.",
  "The list can mix media outlets, blogs, community feeds, hot lists, and research sources in one place, which gives it broader coverage than any single RSS feed.",
  "When a single source updates too slowly or sees too little, the Folo list usually surfaces the move earlier and pushes it into the main intake pool faster.",
  "Independent RSS feeds and coverage-repair logic still run afterward, so the system does not turn one hot list directly into editorial truth.",
] as const;

const PRIMARY_SOURCE_SHOWCASE = [
  "Bloomberg",
  "Financial Times",
  "The Wall Street Journal",
  "Xueqiu Hot",
  "Zhihu Hot List",
  "Hacker News",
  "V2EX",
  "36Kr 24h Hot",
  "Readhub Morning Brief",
  "Binance Announcements",
  "OpenAI News",
  "The GitHub Blog",
  "Google Research Blog",
  "Google Developers Blog",
  "Martin Fowler",
  "Last Week in AI",
  "Anthropic News",
  "a16z crypto",
] as const;

const FILTERING_STEPS = [
  {
    index: "01",
    title: "Fetch the main intake pool",
    description:
      "The pipeline pulls raw items from the last 24 hours according to source priority and per-feed caps, including RSS feeds, the Folo list, and watch-layer sources.",
  },
  {
    index: "02",
    title: "Pre-filter and event compression",
    description:
      "Similar headlines and repeat coverage are compressed into event candidates first, so duplicate reporting does not distort later scoring.",
  },
  {
    index: "03",
    title: "Coverage repair",
    description:
      "If a category looks thin on a given day, the pipeline fetches targeted backup coverage so the report is not captured by a single track.",
  },
  {
    index: "04",
    title: "Editorial agenda plus gate-keep",
    description:
      "The system decides the daily editorial agenda first, then produces PASS, DROP, or MERGE decisions to keep only the items that deserve real space in the issue.",
  },
] as const;

const DAILY_OBJECTIVE =
  "Extract the most valuable information from the last 24 hours and prioritize the signals that best help judge what may matter next.";

const MUST_WATCH_THEMES = [
  "Changes in AI model capability and product form factors",
  "Risk appetite and capital-flow direction in financial markets",
  "Key policy and regulatory shifts",
  "Structural moves in platforms, infrastructure, and chips",
  "Developer tooling and engineering productivity leaps",
] as const;

const SELECTION_PRINCIPLES = [
  "Allow major policy, macro, financial, or geopolitical events to outrank AI on the days when they clearly matter more.",
  "Prefer signals that help judge the next few days or weeks instead of items that are only locally hot.",
  "Do not chase exhaustive article-by-article coverage; use the opening and closing sections to hold the trend judgment together.",
  "Avoid traffic-heavy stories that generate attention but add little decision value.",
] as const;

const PIPELINE_STEPS = [
  {
    title: "1. Fetch and pre-compress",
    description:
      "The day starts with configured feeds only, then similar stories are compressed so the candidate pool reflects events rather than headline volume.",
    bullets: [
      "`fetchPrimary` collects raw entries from the last 24 hours.",
      "`preFilter` collapses duplicated or closely related coverage into observed events.",
      "`tier`, `weight`, and `dailyCap` keep feed priority and flooding under control.",
    ],
  },
  {
    title: "2. Repair coverage and set the agenda",
    description:
      "When a category is under-covered, the pipeline adds targeted sources, then decides what the day is actually about before final ranking.",
    bullets: [
      "`fetchCoverage` fills deficit categories to preserve range across topics.",
      "`editorialAgenda` defines the daily framing, must-cover themes, watch signals, and category boosts.",
      "This is the point where the issue becomes an editorial product instead of a heat-ranked feed.",
    ],
  },
  {
    title: "3. Gate-keep and score",
    description:
      "Candidates are first filtered and merged, then scored across multiple dimensions so only meaningful items reach the issue.",
    bullets: [
      "`gateKeep` returns PASS, DROP, or MERGE decisions in batch, with heuristic fallback when needed.",
      "`score` applies six weighted dimensions plus category weights, daily boosts, and must-cover bonuses.",
      "Minimum category coverage is preserved so one track cannot consume the full page.",
    ],
  },
  {
    title: "4. Generate and distribute",
    description:
      "High-scoring items are turned into structured interpretations, then rendered into the daily report and downstream distribution outputs.",
    bullets: [
      "`insight` converts items into one-liners, event frames, interpretations, and deep-dive candidates.",
      "`generateDaily` writes the Markdown issue and preserves the candidate pool for continuity.",
      "`podcastGen`, `platformsGen`, `publish`, and `notify` handle scripts, platform copy, publishing, and alerts.",
    ],
  },
] as const;

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
            <h1 className="page-title">How this system turns news into judgment</h1>
            <div className="page-meta-row">
              <span className="page-meta-pill">{SITE_SLOGAN_EN}</span>
              <span className="page-meta-pill">{dailyIssues.length} daily issues</span>
              <span className="page-meta-pill">{weeklyIssues.length} weekly digests</span>
              <span className="page-meta-pill">{timelineDays.length} timeline days</span>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            {guide.metrics.map((metric, index) => (
              <div key={METRIC_LABELS[index] ?? metric.label} className="metric-card">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-label">{METRIC_LABELS[index] ?? metric.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
            <div className="space-y-4">
              {ABOUT_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph} className="about-body-copy">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="editorial-card about-side-card p-5">
              <div className="section-label">Project summary</div>
              <p className="about-summary-copy mt-5">
                The goal is not to imitate a newsroom. The goal is to replace the repetitive
                manual work of sorting news by fixing a stable path from noisy inputs to a
                research-grade daily issue.
              </p>

              <div className="about-side-list">
                <div className="about-inline-item">
                  <span className="about-inline-label">Primary flow</span>
                  <span className="about-inline-value">{PROJECT_FLOW_LABEL}</span>
                </div>
                <div className="about-inline-item">
                  <span className="about-inline-label">Core value</span>
                  <span className="about-inline-value">{PROJECT_VALUE_LABEL}</span>
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
          <div className="section-label">Source system</div>
          <p className="about-section-lead">
            Every input source is explicitly configured in{" "}
            <code className="markdown-inline-code">configs/feeds.json</code>. The pipeline does
            not discover random sources at runtime. It continuously tracks a known source stack
            so the archive stays auditable.
          </p>

          {guide.primarySource ? (
            <section className="about-primary-card">
              <div className="about-primary-head">
                <div>
                  <div className="about-primary-kicker">Primary discovery layer</div>
                  <h2 className="about-primary-title">Folo List</h2>
                  <p className="about-primary-copy">
                    The old <code className="markdown-inline-code">{guide.primarySource.alias}</code>{" "}
                    alias still exists in configuration for backward compatibility, but the
                    product-facing explanation now treats the source consistently as the Folo list.
                    It is the single most important discovery entry point in the entire system.
                  </p>
                </div>
                <div className="about-primary-meta">
                  <span className="page-meta-pill">{TIER_LABELS[guide.primarySource.tier]}</span>
                  <span className="page-meta-pill">Weight {guide.primarySource.weight}</span>
                  {typeof guide.primarySource.dailyCap === "number" ? (
                    <span className="page-meta-pill">Cap {guide.primarySource.dailyCap}</span>
                  ) : null}
                </div>
              </div>

              <div className="about-primary-grid">
                <div className="about-primary-panel">
                  <div className="about-bullet-title">Its role in the system</div>
                  <p className="about-summary-copy">
                    This is not a single RSS feed. It is a curated, continuously maintained list
                    inside Folo that prioritizes high-value signals across AI, developer tools,
                    macro, investment, and cross-domain trend changes.
                  </p>
                </div>

                <div className="about-primary-panel">
                  <div className="about-bullet-title">Why it is explained first</div>
                  <ul className="about-bullet-list">
                    {PRIMARY_SOURCE_HIGHLIGHTS.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="about-primary-panel about-primary-panel-wide">
                <div className="about-bullet-title">What weight 100 actually means</div>
                <p className="about-summary-copy">
                  The weight is not a score for one article. It tells the fetch layer that the
                  Folo list is the highest-priority discovery entrance. If a high-value movement
                  appears there, it should enter the main intake pool earlier than ordinary
                  single-feed updates and then pass through the later de-duplication, filtering,
                  and scoring stages.
                </p>
              </div>

              <div className="about-rule-row">
                {PRIMARY_SOURCE_SHOWCASE.map((source) => (
                  <span key={source} className="outline-chip">
                    {source}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="metric-card">
              <div className="metric-value">{guide.tierCounts.core}</div>
              <div className="metric-label">Core sources</div>
              <p className="about-metric-note">
                High-priority and higher-trust inputs that are suitable for direct entry into the
                main pool.
              </p>
            </div>
            <div className="metric-card">
              <div className="metric-value">{guide.tierCounts.signal}</div>
              <div className="metric-label">Signal sources</div>
              <p className="about-metric-note">
                Used to broaden coverage and import external signals so the issue is not dominated
                by one source type.
              </p>
            </div>
            <div className="metric-card">
              <div className="metric-value">{guide.tierCounts.watch}</div>
              <div className="metric-label">Watch sources</div>
              <p className="about-metric-note">
                Primarily for trend watching and hot-list monitoring, not guaranteed entry into the
                main daily pool.
              </p>
            </div>
          </div>

          <div className="about-rule-row">
            <span className="outline-chip">`weight` controls source priority</span>
            <span className="outline-chip">`dailyCap` limits single-feed flooding</span>
            <span className="outline-chip">`keepInMainPool` decides main-pool entry</span>
            <span className="outline-chip">`tier` shapes fetch order and repair strategy</span>
          </div>

          <div className="about-source-grid">
            {guide.sourceGroups.map((group) => {
              const copy = SOURCE_GROUP_COPY[group.category] ?? {
                label: CATEGORY_LABELS[group.category] ?? group.label,
                description: group.description,
              };

              return (
                <section key={group.category} className="about-source-card">
                  <div className="about-source-head">
                    <div>
                      <h2 className="about-source-title">{copy.label}</h2>
                      <p className="about-source-copy">{copy.description}</p>
                    </div>
                    <span className="page-meta-pill">{group.feeds.length} feeds</span>
                  </div>

                  <div className="about-feed-list">
                    {group.feeds.map((feed) => (
                      <div key={`${group.category}-${feed.name}`} className="about-feed-item">
                        <div className="about-feed-main">
                          <div className="about-feed-title">{feed.name}</div>
                          <div className="about-feed-meta">
                            {TIER_LABELS[feed.tier]} · Weight {feed.weight}
                            {typeof feed.dailyCap === "number" ? ` · Cap ${feed.dailyCap}` : ""}
                          </div>
                        </div>
                        <span
                          className={`issue-stamp ${feed.isMainPool ? "" : "issue-stamp-muted"}`}
                        >
                          {feed.isMainPool ? "Main pool" : "Watch"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="editorial-card p-6 md:p-8">
          <div className="section-label">Filtering logic</div>
          <p className="about-section-lead">
            The first goal is not to fetch more. It is to remove duplicates, thin signals, and
            non-judgmental noise before filling the coverage gaps that still matter.
          </p>

          <div className="about-stage-grid">
            {FILTERING_STEPS.map((step) => (
              <section key={step.index} className="about-stage-card">
                <div className="about-stage-index">{step.index}</div>
                <h2 className="about-stage-title">{step.title}</h2>
                <p className="about-stage-copy">{step.description}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="editorial-card p-6 md:p-8">
            <div className="section-label">Scoring logic</div>
            <p className="about-section-lead">
              After gate-keeping, the system does not simply sort by heat. It scores each candidate
              across six dimensions and then combines that result with category strategy.
            </p>

            <div className="about-score-grid">
              {guide.scoreDimensions.map((dimension) => {
                const copy = SCORE_DIMENSION_COPY[dimension.key] ?? {
                  label: dimension.label,
                  description: dimension.description,
                };

                return (
                  <section key={dimension.key} className="about-score-card">
                    <div className="about-score-head">
                      <span className="about-score-title">{copy.label}</span>
                      <span className="page-meta-pill">{Math.round(dimension.weight * 100)}%</span>
                    </div>
                    <p className="about-score-copy">{copy.description}</p>
                  </section>
                );
              })}
            </div>
          </section>

          <section className="editorial-card p-6 md:p-8">
            <div className="section-label">Editorial strategy</div>
            <p className="about-section-lead">{DAILY_OBJECTIVE}</p>

            <div className="about-weight-list">
              {guide.categoryWeights.map((weight) => (
                <div key={weight.category} className="about-weight-row">
                  <div>
                    <div className="about-weight-title">
                      {CATEGORY_LABELS[weight.category] ?? weight.label}
                    </div>
                    <div className="about-weight-meta">
                      Category weight {weight.weight.toFixed(2)} · Minimum coverage{" "}
                      {weight.minimumCoverage}
                    </div>
                  </div>
                  <div className="about-weight-bar">
                    <span
                      className="about-weight-bar-fill"
                      style={{ width: `${Math.max(10, weight.weight * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="about-bullet-block">
              <h3 className="about-bullet-title">Themes that must stay under watch</h3>
              <ul className="about-bullet-list">
                {MUST_WATCH_THEMES.map((theme) => (
                  <li key={theme}>{theme}</li>
                ))}
              </ul>
            </div>

            <div className="about-bullet-block">
              <h3 className="about-bullet-title">Selection principles</h3>
              <ul className="about-bullet-list">
                {SELECTION_PRINCIPLES.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
            </div>
          </section>
        </section>

        <section className="editorial-card p-6 md:p-8">
          <div className="section-label">Final aggregation logic</div>
          <p className="about-section-lead">
            Once high-scoring items are confirmed, the system can finally turn them from raw news
            into a readable daily structure.
          </p>

          <div className="about-flow-line">{PROJECT_FLOW_LABEL}</div>

          <div className="about-stage-grid">
            {PIPELINE_STEPS.map((step) => (
              <section key={step.title} className="about-stage-card">
                <h2 className="about-stage-title">{step.title}</h2>
                <p className="about-stage-copy">{step.description}</p>
                <ul className="about-bullet-list about-stage-list">
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="about-summary-card">
              <div className="about-bullet-title">What the final outputs are</div>
              <p className="about-summary-copy">
                Daily detail pages render the generated Markdown directly. Weekly issues extend the
                same structure, while the homepage is responsible for browsing and historical recall.
                The frontend does not reinterpret the content itself. It organizes generated
                artifacts into a readable interface.
              </p>
            </section>

            <section className="about-summary-card">
              <div className="about-bullet-title">Why this project exists</div>
              <p className="about-summary-copy">{PROJECT_VALUE_LABEL}</p>
            </section>
          </div>
        </section>
      </article>
    </PublicationShell>
  );
}
