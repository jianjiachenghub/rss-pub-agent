# Editorial Reporting Frontend Redesign

## Goal

Redesign the news site from a thin markdown reader into an editorial archive with
three distinct experiences:

- a mixed home shell that combines archive navigation and current issue entry
- report-style daily and weekly reading pages
- a day-based timeline for scanning the archive

The visual direction should borrow from WIRED's black-and-white editorial feel
without cloning a generic media portal. The product should feel like a
publication and a research archive at the same time.

## Confirmed Product Direction

### Home shell

- left side keeps a fixed issue navigation
- top of the main area switches between `日报`, `周报`, and `时间线`
- default home view opens the latest daily issue inside the home shell

### Reading pages

- daily pages are report-reading pages, not magazine cover layouts
- weekly pages are also report-reading pages with the same structural language
- images appear only when a real image exists; no filler art or placeholders

### Timeline

- first version is day-based
- each day shows one judgment line plus 3-5 key stories
- each node links to the full daily issue

### Weekly report

- weekly content must be a real generated weekly issue
- it should not be a front-end-only aggregation page
- structure should mirror the daily report at a higher level of judgment

## Information Architecture

### Routes

- `/`
  - editorial home shell
  - defaults to the latest daily issue tab
- `/daily/[date]`
  - full daily reading page
- `/weekly/[week]`
  - full weekly reading page
- timeline is rendered as a home tab in v1 rather than a separate route

### Navigation model

- the left rail is an issue navigator, not a generic file tree
- daily issues are grouped by month
- weekly issues appear as first-class entries in the same archive language
- the active issue uses black background and white text for emphasis

## Page Design

### Home shell

The home page should use an editorial masthead and one main content column
beside a fixed archive rail.

#### Masthead

- publication-style wordmark
- tab switcher for `日报`, `周报`, `时间线`
- actions for `最新一期` and archive jump

#### Daily tab

- lead section with latest issue title, date, one judgment line, and meta
- optional lead image when present
- key story section showing 3-5 highest-value items from the latest daily issue
- follow-up section showing watch signals and quick links to nearby issues

#### Weekly tab

- reverse-chronological weekly issue cards
- each card shows week range, weekly judgment, key themes, issue count, and CTA
- the latest weekly issue gets a larger treatment than older archive cards

#### Timeline tab

- vertical day-based timeline
- each day node shows:
  - date
  - one-line daily judgment
  - 3-5 key story titles
  - jump to full daily issue

### Daily reading page

- publication label
- issue title
- date and meta
- opening judgment block
- category overview cards instead of a markdown table
- structured item sections grouped by category
- watch signals section
- secondary 24h candidate section rendered as a lower-priority appendix

Each main item should render in a stable report block:

- title
- source, score, and time
- one-line hook
- optional image
- fact
- impact
- judgment
- action
- optional comparison table or code block

### Weekly reading page

The weekly page follows the same visual language as the daily page but operates
one level higher.

- weekly judgment
- weekly overview
- weekly narrative sections
- representative items
- next-week watchlist

The weekly issue must read as a synthesis, not a concatenation of daily issues.

## Data Model Changes

The redesign should stop depending on markdown parsing for primary rendering.
The pipeline already holds structured state for daily generation, so publish
should emit structured artifacts for the frontend.

### Daily artifacts

For each daily issue, publish a structured JSON report alongside `daily.md`.

Suggested fields:

- issue kind and id
- title
- date
- summary / opening judgment
- watch signals
- meta
- category overview
- structured sections and items
- secondary items

The markdown file remains for compatibility and external distribution, but the
frontend should prefer structured report JSON.

### Weekly artifacts

For each week, publish a generated weekly report and matching structured JSON.

Suggested fields:

- week id and date range
- weekly judgment
- key themes
- overview stats
- structured weekly sections
- representative items
- next-week watchlist

### Archive indexes

The frontend needs a loader-friendly archive index that can answer:

- all daily issue ids
- all weekly issue ids
- grouped daily archive metadata
- lightweight timeline data
- nearest issues for home tab previews

## Frontend Component Model

Recommended component split:

- `ArchiveShell`
- `Masthead`
- `IssueRail`
- `HomeTabs`
- `DailyLead`
- `WeeklyArchiveGrid`
- `TimelineView`
- `ReportHeader`
- `CategoryOverview`
- `ReportSection`
- `InsightItem`
- `WatchSignals`

The shell and report pages should share typography, borders, labels, and spacing
tokens so they feel like one publication system.

## Visual System

### Tone

- editorial
- high-contrast
- black and white with restrained gray scale
- image-aware but not image-dependent

### Rules

- emphasize structure with borders, spacing, and labels rather than bright color
- use distinctive display typography and sober reading typography
- maintain mobile usability by collapsing the issue rail into a drawer
- keep animations subtle and purposeful

## Implementation Order

1. publish structured daily artifacts
2. generate and publish weekly reports
3. add archive loaders for daily, weekly, and timeline metadata
4. redesign the shared shell and issue rail
5. implement home tabs
6. migrate daily and weekly pages to structured rendering
7. verify build and issue navigation flows

## Risks

- current worktree already contains unrelated pipeline edits, so new changes must
  stay isolated and avoid reverting user work
- some historic daily files may not contain images, so layouts must remain strong
  in pure-text mode
- weekly generation should be tolerant of sparse weeks and missing podcast/media

## Success Criteria

- home page supports `日报 / 周报 / 时间线` within one editorial shell
- daily pages render from structured data rather than markdown-only prose
- weekly pages are real generated reports
- the archive rail makes daily and weekly issues easy to scan
- the UI feels editorial and publication-grade while remaining readable
