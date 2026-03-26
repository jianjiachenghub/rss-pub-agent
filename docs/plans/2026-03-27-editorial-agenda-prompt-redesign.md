# Editorial Agenda Prompt Redesign

## Goal

Refactor the prompt and decision stack from an "AI news digest" into a
"personal multi-category daily report" that:

- prioritizes AI and investment/finance in the long run
- allows major policy, macro, financial, or geopolitical events to outrank AI on a given day
- focuses item-level output on signal extraction rather than macro commentary
- concentrates trend judgment in the opening and closing sections of the daily report

## Product Positioning

The report is no longer framed as a pure AI daily. It becomes a personal
decision-support daily that helps the reader answer:

- what mattered most in the last 24 hours
- what changes the medium-term outlook
- which signals are worth tracking next

Long-term category preference:

1. AI
2. Investment / finance
3. Tech
4. Software engineering
5. Business
6. Politics / geopolitics
7. Social / community signals

But the final ordering is dynamic: major policy or macro shocks can outrank AI.

## Architecture Change

Current chain:

`fetchPrimary -> preFilter -> fetchCoverage -> gateKeep -> score -> insight -> generateDaily`

New chain:

`fetchPrimary -> preFilter -> fetchCoverage -> editorialAgenda -> gateKeep -> score -> insight -> generateDaily`

### New Node: `editorialAgenda`

This node creates a compact editorial brief for the day from the compressed
candidate pool. The brief is reused by later nodes so they share the same daily
judgment.

The brief includes:

- `dominantNarrative`
- `openingAngle`
- `closingOutlookAngle`
- `mustCoverThemes`
- `watchSignals`
- `mustCoverIds`
- `categoryBoosts`

`categoryBoosts` are temporary daily adjustments on top of the base category
weights from config.

## Prompt Strategy

### 1. Gate Keep

Role shift:

- from generic noise filter
- to editorial triage for a personal daily report

Core question:

"Should this item enter today's decision-support report at all?"

Gate-keep should favor:

- strong factual signals
- items that improve the user's judgment of the next days/weeks
- representative coverage of a major event cluster

Gate-keep should reject:

- routine product marketing
- duplicated event coverage already represented elsewhere
- hot-take fragments without signal value

### 2. Score

Role shift:

- from AI-industry scoring
- to cross-category signal scoring

New dimensions:

- `signalStrength`
- `futureImpact`
- `personalRelevance`
- `decisionUsefulness`
- `credibility`
- `timeliness`

LLM returns the per-dimension scores and reasoning.

Code computes final score using:

- weighted dimension score
- base category priority from config
- temporary daily boost from `editorialAgenda`
- `mustCoverIds` bonus

This keeps final ranking auditable and stable.

### 3. Insight

Role shift:

- from macro-heavy commentary on every item
- to concise item-level explanation

Each item should explain:

- what happened
- why it made today's report
- what variable or track it changes

It should avoid turning every single item into a broad trend essay.

### 4. Daily Report Framing

Trend judgment should move to the report framing layer:

- opening: today's main judgment
- closing: what to watch next

The item sections remain concrete and restrained.

## Config Change

`configs/prompt.json` becomes an editorial strategy file instead of only an
interest keyword file.

New config areas:

- `reportName`
- `editorial.positioning`
- `editorial.dailyObjective`
- `editorial.baseCategoryWeights`
- `editorial.minimumCategoryCoverage`
- `editorial.scoringWeights`
- `editorial.mustWatchThemes`
- `editorial.selectionPrinciples`

This lets product tuning happen in config instead of hard-coded prompts.

## Selection Logic

Final scored selection uses:

- `config.topN` as the deep-dive count
- category minimum coverage from config
- dynamic effective category weights from:
  - base weights
  - agenda boosts
- score-based fill after minimum coverage

This preserves baseline coverage while allowing a major daily theme to dominate.

## Reporting Output

The daily report title and framing should stop saying "AI daily".

Recommended framing:

- title: personal daily / signal daily
- opening: `今日判断`
- middle: categorized items
- closing: `接下来要盯的变量`

## Verification

Implementation should be verified with:

- `npx tsc --noEmit`
- one pipeline smoke test through `npx tsx graph.ts`

Known external risk:

- some providers may still reject politically sensitive content during later
  LLM stages, which is separate from the prompt redesign itself.
