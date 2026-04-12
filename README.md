<div align="center">

# LLM News Flow

<p>
  <a href="./README.zh-CN.md">
    <img alt="Chinese README" src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-README-1677ff?style=for-the-badge">
  </a>
</p>

<p>
  <a href="https://rss-pub-agent.vercel.app">
    <img alt="Demo" src="https://img.shields.io/badge/demo-live-111827?style=flat-square">
  </a>
  <a href="https://github.com/jianjiachenghub/rss-pub-agent/actions/workflows/daily-pipeline.yml">
    <img alt="Daily Pipeline" src="https://github.com/jianjiachenghub/rss-pub-agent/actions/workflows/daily-pipeline.yml/badge.svg">
  </a>
  <a href="https://github.com/jianjiachenghub/rss-pub-agent/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/jianjiachenghub/rss-pub-agent?style=flat-square">
  </a>
  <a href="./LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square">
  </a>
</p>

<p>
  <img alt="LangGraph.js" src="https://img.shields.io/badge/LangGraph.js-Orchestration-1f6feb?style=flat-square">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square">
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square">
</p>

<p>
  An AI-powered personal newsroom that turns high-volume feeds into a daily report,
  platform copy, podcast scripts, and a static publication site.
</p>

</div>

## Overview

LLM News Flow is not a generic RSS reader. It is an automated editorial pipeline:

- It ingests 28 Folo / RSS feed sources across 7 categories.
- It compresses noisy raw items into event candidates.
- It uses an editorial agenda plus multi-step LLM filtering and scoring.
- It publishes structured daily reports, social distribution copy, and podcast scripts.
- It serves the output through a Next.js static site backed by the generated `content/` contract.

The result is a repeatable system for turning "too much information" into "one report with judgment."

## Table Of Contents

- [Why This Project](#why-this-project)
- [Highlights](#highlights)
- [Architecture](#architecture)
- [What It Produces](#what-it-produces)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Run Locally](#run-locally)
- [Repository Layout](#repository-layout)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why This Project

Most feed readers optimize for collection. This project optimizes for editorial output.

It is built around a few constraints:

- Raw input volume is too large to review manually every day.
- Hot items are not always decision-useful items.
- AI-heavy days can easily drown out policy, market, software, and business signals.
- Daily report generation, social copy, and site publishing should come from one source of truth.

So instead of building a nicer feed inbox, this repo builds a news operating system.

## Highlights

- `14-node LangGraph pipeline` from config loading to publishing and notification
- `Editorial agenda layer` to decide the dominant narrative before scoring
- `Coverage-aware ingestion` so one category does not monopolize the report
- `Controlled LLM concurrency` with provider fallback and cooldown handling
- `Resume-from-raw` workflow using `content/<date>/raw/` snapshots
- `Single content contract` consumed by the Next.js frontend
- `Multi-output publishing` for daily report, brief, Douyin, Xiaohongshu, and podcast script

## Architecture

```text
START
  -> loadConfig
  -> fetchPrimary
  -> preFilter
  -> fetchCoverage
  -> buildEditorialAgenda
  -> gateKeep
  -> score
  -> enrichSelected
  -> insight
  -> generateDaily
  -> podcastGen ----\
  -> platformsGen --+-> publish
  -> notify
  -> END
```

Pipeline characteristics:

- `fetchPrimary` pulls the primary `folo-list` feed as the main input snapshot.
- `preFilter` compresses raw items into event candidates and computes coverage gaps.
- `fetchCoverage` backfills categories that are underrepresented.
- `buildEditorialAgenda` generates the narrative frame and category boosts for the day.
- `gateKeep` and `score` decide what deserves the report.
- `generateDaily` writes the canonical Markdown report.
- `podcastGen` and `platformsGen` run in parallel after the daily report is assembled.
- `publish` writes the final file outputs and updates `content/index.json`.

For more detail, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## What It Produces

Each successful run writes a dated content package:

```text
content/YYYY-MM-DD/
|- daily.md
|- meta.json
|- brief.md
|- douyin.md
|- xhs.md
|- podcast-script.md
`- raw/
```

Artifact summary:

| File | Purpose |
|---|---|
| `daily.md` | Canonical daily report |
| `meta.json` | Summary metadata such as item count, categories, average score, and podcast availability |
| `brief.md` | Compact summary for notification and lightweight distribution |
| `douyin.md` | Douyin copy |
| `xhs.md` | Xiaohongshu copy |
| `podcast-script.md` | Podcast script; audio upload is optional and depends on TTS + R2 |
| `raw/` | Debug and resume snapshots, not frontend-facing content |

The frontend reads directly from `content/`. Weekly views are generated dynamically from daily issues rather than being stored as standalone weekly artifacts.

## Tech Stack

| Layer | Stack |
|---|---|
| Pipeline orchestration | LangGraph.js + TypeScript |
| LLM layer | zhipu / gemini / openai / deepseek / siliconflow |
| Fetching | Folo API + RSSHub + rss-parser |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Content rendering | react-markdown + remark-gfm |
| Storage | Git for content, `.runtime` for delivery state, Cloudflare R2 for optional podcast audio |
| Deployment | GitHub Actions + Vercel |
| Notifications | Feishu webhook, Telegram bot, WeChat webhook |

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/jianjiachenghub/rss-pub-agent.git
cd rss-pub-agent
```

### 2. Install dependencies

```bash
cd scripts && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Create your `.env`

```bash
cp .env.example .env
```

At minimum, configure one LLM provider:

```bash
LLM_PROVIDERS=zhipu,gemini,openai
ZHIPU_API_KEY=your_key_here
```

### 4. Run the pipeline

```bash
npm run graph
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

The repo is driven by three main JSON configs:

| File | Role |
|---|---|
| `configs/feeds.json` | Feed sources, categories, weights, caps, and main-pool behavior |
| `configs/prompt.json` | Interests, scoring weights, minimum coverage, editorial preferences |
| `configs/platforms.json` | Notification and output-channel configuration |

Common optional environment variables:

| Variable | Purpose |
|---|---|
| `FOLO_SESSION_TOKEN` | Required for the primary Folo list workflow |
| `GEMINI_API_KEY` | Enables Gemini fallback and TTS |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram notifications |
| `FEISHU_WEBHOOK_URL` | Feishu notifications |
| `WECHAT_WEBHOOK_URL` | WeChat notifications |
| `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_PUBLIC_DOMAIN` | Optional podcast audio upload |
| `REPORT_BASE_URL` | External URL used in delivery messages |

## Run Locally

### Pipeline

From the repo root:

```bash
npm run graph
npm run pipeline
```

Or from `scripts/` directly:

```bash
cd scripts
npx tsx graph.ts
npx tsx graph.ts --date 2026-04-08
npx tsx graph.ts --resume-from-raw 2026-04-08
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

Important note:

- The root `package.json` only proxies the pipeline commands.
- Frontend commands are intentionally run from `frontend/`.

## Repository Layout

```text
rss-pub-agent/
|- configs/                 Runtime configuration
|- scripts/                 LangGraph pipeline and business logic
|- frontend/                Next.js publication site
|- content/                 Generated content contract
|- .runtime/                Runtime state such as Feishu delivery records
|- docs/                    Architecture docs, plans, and archive
|- reports/                 Legacy compatibility artifacts
|- web/                     Legacy Vite prototype
`- .github/workflows/       Scheduled automation
```

Recommended reading order:

1. [README.zh-CN.md](./README.zh-CN.md) if you prefer Chinese
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
3. [frontend/README.md](./frontend/README.md)
4. [docs/README.md](./docs/README.md)

## Roadmap

- [ ] Consolidate legacy `web/` and `reports/` paths into a cleaner public repo surface
- [ ] Add richer observability around provider performance and run metrics
- [ ] Expand English-facing generated artifacts and site copy
- [ ] Harden open-source setup for contributors and self-hosters

## Contributing

Issues and pull requests are welcome.

If you want to contribute effectively:

- Do not edit `content/` manually unless you are intentionally updating generated artifacts.
- Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before changing pipeline behavior.
- Keep changes scoped by functional boundary.
- Prefer adding or updating tests under `scripts/` when changing pipeline logic.

## License

This project is released under the [MIT License](./LICENSE).
