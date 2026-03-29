import PublicationShell from "@/components/PublicationShell";
import {
  getAllDailyIssues,
  getTimelineDays,
  getWeeklyIssues,
} from "@/lib/content-loader";
import { getProjectGuideData } from "@/lib/project-guide";
import {
  PROJECT_ABOUT_PARAGRAPHS,
  PROJECT_FLOW_LABEL,
  PROJECT_VALUE_LABEL,
  SITE_REPO_URL,
  SITE_SLOGAN,
} from "@/lib/site";

const TIER_LABELS = {
  core: "Core",
  signal: "Signal",
  watch: "Watch",
} as const;

export default function AboutPage() {
  const dailyIssues = getAllDailyIssues();
  const weeklyIssues = getWeeklyIssues();
  const timelineDays = getTimelineDays(14);
  const guide = getProjectGuideData();

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
              {PROJECT_ABOUT_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-black/78">
                  {paragraph}
                </p>
              ))}
              <p className="text-base leading-8 text-black/78">
                这不是一个“抓到什么就展示什么”的前端壳子。它的核心是先把
                多源信息做去重、编务判断、评分和结构化解读，再输出到日报、周报、播客和平台摘要。
                因此你在首页看到的是编辑结果，在详情页看到的是原始 Markdown 报告。
              </p>
            </div>

            <div className="editorial-card about-side-card p-5">
              <div className="section-label">项目摘要</div>
              <p className="mt-5 text-sm leading-7 text-black/74">
                这套系统的目标不是替代媒体，而是替代手工筛选新闻的重复劳动。
                它把“海量输入 → 去噪 → 判断 → 输出”的路径固定下来，确保每天都能产出一份结构稳定的研究日报。
              </p>

              <div className="about-side-list">
                <div className="about-inline-item">
                  <span className="about-inline-label">主流程</span>
                  <span className="about-inline-value">{PROJECT_FLOW_LABEL}</span>
                </div>
                <div className="about-inline-item">
                  <span className="about-inline-label">核心价值</span>
                  <span className="about-inline-value">{PROJECT_VALUE_LABEL}</span>
                </div>
              </div>

              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="action-chip mt-6"
              >
                查看 GitHub 源码
              </a>
            </div>
          </div>
        </section>

        <section className="editorial-card p-6 md:p-8">
          <div className="section-label">新闻来源</div>
          <p className="about-section-lead">
            所有输入源都在 <code className="markdown-inline-code">configs/feeds.json</code>
            里显式配置。系统不会在运行时临时抓陌生来源，而是基于已知信源做持续追踪。
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="metric-card">
              <div className="metric-value">{guide.tierCounts.core}</div>
              <div className="metric-label">Core 源</div>
              <p className="about-metric-note">
                高优先级、可信度更高、适合直接进入主输入池。
              </p>
            </div>
            <div className="metric-card">
              <div className="metric-value">{guide.tierCounts.signal}</div>
              <div className="metric-label">Signal 源</div>
              <p className="about-metric-note">
                用来补充覆盖面和外部信号，帮助日报不被单一来源主导。
              </p>
            </div>
            <div className="metric-card">
              <div className="metric-value">{guide.tierCounts.watch}</div>
              <div className="metric-label">Watch 源</div>
              <p className="about-metric-note">
                主要用于趋势观察或热榜补充，默认不一定进入日报主池。
              </p>
            </div>
          </div>

          <div className="about-rule-row">
            <span className="outline-chip">weight 控制信源优先级</span>
            <span className="outline-chip">dailyCap 限制单源灌水</span>
            <span className="outline-chip">keepInMainPool 决定是否进主池</span>
            <span className="outline-chip">tier 用于抓取顺序和补源策略</span>
          </div>

          <div className="about-source-grid">
            {guide.sourceGroups.map((group) => (
              <section key={group.category} className="about-source-card">
                <div className="about-source-head">
                  <div>
                    <h2 className="about-source-title">{group.label}</h2>
                    <p className="about-source-copy">{group.description}</p>
                  </div>
                  <span className="page-meta-pill">{group.feeds.length} 个信源</span>
                </div>

                <div className="about-feed-list">
                  {group.feeds.map((feed) => (
                    <div key={`${group.category}-${feed.name}`} className="about-feed-item">
                      <div className="about-feed-main">
                        <div className="about-feed-title">{feed.name}</div>
                        <div className="about-feed-meta">
                          {TIER_LABELS[feed.tier]} · 权重 {feed.weight}
                          {typeof feed.dailyCap === "number" ? ` · cap ${feed.dailyCap}` : ""}
                        </div>
                      </div>
                      <span className={`issue-stamp ${feed.isMainPool ? "" : "issue-stamp-muted"}`}>
                        {feed.isMainPool ? "主池" : "观察"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="editorial-card p-6 md:p-8">
          <div className="section-label">过滤逻辑</div>
          <p className="about-section-lead">
            第一目标不是“抓更多”，而是先把重复、稀薄、无判断价值的噪音压掉，再补齐需要覆盖的类别。
          </p>

          <div className="about-stage-grid">
            <section className="about-stage-card">
              <div className="about-stage-index">01</div>
              <h2 className="about-stage-title">抓取主输入池</h2>
              <p className="about-stage-copy">
                <code className="markdown-inline-code">fetchPrimary</code>
                会按信源优先级和限制抓取过去 24 小时的原始条目，包含 RSS、Folo 列表和观察源。
              </p>
            </section>

            <section className="about-stage-card">
              <div className="about-stage-index">02</div>
              <h2 className="about-stage-title">预筛与事件压缩</h2>
              <p className="about-stage-copy">
                <code className="markdown-inline-code">preFilter</code>
                把相似标题和相同事件压成 event candidates，减少重复报道对后续打分的干扰。
              </p>
            </section>

            <section className="about-stage-card">
              <div className="about-stage-index">03</div>
              <h2 className="about-stage-title">覆盖补源</h2>
              <p className="about-stage-copy">
                如果某些类别当天不够，<code className="markdown-inline-code">fetchCoverage</code>
                会定向补抓，避免日报被单一赛道完全占满。
              </p>
            </section>

            <section className="about-stage-card">
              <div className="about-stage-index">04</div>
              <h2 className="about-stage-title">编务议程 + Gate-Keep</h2>
              <p className="about-stage-copy">
                <code className="markdown-inline-code">editorialAgenda</code>
                先决定当天主线，再由 <code className="markdown-inline-code">gateKeep</code>
                输出 PASS / DROP / MERGE，把真正值得进入日报主战场的条目留下来。
              </p>
            </section>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="editorial-card p-6 md:p-8">
            <div className="section-label">评分逻辑</div>
            <p className="about-section-lead">
              通过 Gate-Keep 之后，系统不是简单按热度排序，而是按 6 个维度和类目策略综合算分。
            </p>

            <div className="about-score-grid">
              {guide.scoreDimensions.map((dimension) => (
                <section key={dimension.key} className="about-score-card">
                  <div className="about-score-head">
                    <span className="about-score-title">{dimension.label}</span>
                    <span className="page-meta-pill">{Math.round(dimension.weight * 100)}%</span>
                  </div>
                  <p className="about-score-copy">{dimension.description}</p>
                </section>
              ))}
            </div>
          </section>

          <section className="editorial-card p-6 md:p-8">
            <div className="section-label">编辑策略</div>
            <p className="about-section-lead">{guide.dailyObjective}</p>

            <div className="about-weight-list">
              {guide.categoryWeights.map((weight) => (
                <div key={weight.category} className="about-weight-row">
                  <div>
                    <div className="about-weight-title">{weight.label}</div>
                    <div className="about-weight-meta">
                      类目权重 {weight.weight.toFixed(2)} · 最低覆盖 {weight.minimumCoverage}
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
              <h3 className="about-bullet-title">必须持续跟踪的主题</h3>
              <ul className="about-bullet-list">
                {guide.mustWatchThemes.map((theme) => (
                  <li key={theme}>{theme}</li>
                ))}
              </ul>
            </div>

            <div className="about-bullet-block">
              <h3 className="about-bullet-title">选题原则</h3>
              <ul className="about-bullet-list">
                {guide.selectionPrinciples.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
            </div>
          </section>
        </section>

        <section className="editorial-card p-6 md:p-8">
          <div className="section-label">最终聚合逻辑</div>
          <p className="about-section-lead">
            当高分条目被确认后，系统才开始把它们从“新闻”转成“可读的日报结构”。
          </p>

          <div className="about-flow-line">{PROJECT_FLOW_LABEL}</div>

          <div className="about-stage-grid">
            {guide.pipelineSteps.map((step) => (
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
              <div className="about-bullet-title">最终输出是什么</div>
              <p className="about-summary-copy">
                日报详情页直接渲染生成好的 Markdown，周报延续同样结构，首页则负责浏览和回看。
                这意味着前端不解释内容本身，只负责把生成结果组织成可读界面。
              </p>
            </section>

            <section className="about-summary-card">
              <div className="about-bullet-title">这个项目的价值</div>
              <p className="about-summary-copy">{PROJECT_VALUE_LABEL}</p>
            </section>
          </div>
        </section>
      </article>
    </PublicationShell>
  );
}
