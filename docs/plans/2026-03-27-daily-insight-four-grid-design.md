# Daily Insight Four-Grid Redesign

## Goal

Refactor item-level daily insights from generic single-paragraph commentary into
a four-grid decision-support format for a reader who simultaneously cares about:

- AI capability and product shape changes
- product strategy
- engineering execution
- investment and capital-market implications

The new output should answer four concrete questions per item:

- what happened
- what it changes
- how that updates judgment
- what to watch next

## Reader Model

Primary reader:

- follows AI closely
- also cares about product positioning, engineering leverage, and capital flow
- does not want generic hype or media-summary prose
- wants each item to be useful for updating short-to-medium-term judgment

Implication:

- item output must be concrete and compact
- each item should focus on the 1-2 most relevant lenses
- output should help the reader decide what to validate next, not just what to
  read next

## Output Format

Each deep-dive item keeps a concise `oneLiner` for summary surfaces, but the
main body becomes four explicit fields:

- `fact`
- `impact`
- `judgment`
- `action`

### Field intent

`fact`

- 40-70 Chinese characters
- explains the actual event
- must not restate the title in empty words

`impact`

- 50-90 Chinese characters
- covers only the 1-2 most relevant lenses
- preferred lenses:
  - AI
  - product
  - engineering
  - investment

`judgment`

- 50-90 Chinese characters
- states which variable changed:
  - product entry point
  - distribution leverage
  - engineering cost
  - regulatory expectation
  - funding / listing path
  - risk appetite
  - supply / platform structure

`action`

- 40-80 Chinese characters
- SMART-lite requirement:
  - specific
  - observable
  - decision-relevant
  - includes a time window
- must not degrade into “持续关注后续进展”

## Architecture Change

Only the `insight -> generateDaily` segment needs behavior change.

Current item model:

- `oneLiner`
- `content`

New item model:

- `oneLiner`
- `fact`
- `impact`
- `judgment`
- `action`
- `content` kept as a compatibility field generated from the four sections

This keeps downstream nodes stable while allowing daily rendering to show the
structured version.

## Prompt Strategy

### Insight prompt

The insight model should be told:

- do not explain why the item was selected
- do not use labels like “为什么值得看”
- do not turn each item into macro commentary
- do write a reader-useful note with four explicit sections

The model should return JSON with:

- `id`
- `oneLiner`
- `fact`
- `impact`
- `judgment`
- `action`
- optional media / code / comparison fields

### Lens rule

`impact` should only cover the most relevant 1-2 lenses for the item.

Examples:

- Apple opens Siri interfaces:
  - product + engineering
- AI startup plans Hong Kong listing:
  - investment + AI ecosystem
- antitrust comment on AI scrutiny:
  - AI + regulation / capital formation

## Quality Gates

### Invalid `fact`

- title restatement only
- phrases like:
  - “这条新闻讲的是”
  - “这件事说明了”
  - “文章主要讲的是”
- missing subject / action / outcome

### Invalid `impact`

- writes all four lenses every time
- only says “有重要影响”“值得关注”
- does not land on a work surface:
  - entry point
  - roadmap
  - engineering workflow
  - compliance
  - valuation / funding
  - market positioning

### Invalid `judgment`

- repeats impact instead of updating judgment
- does not identify the variable that changed
- only gives broad trend language

### Invalid `action`

- “持续关注后续进展”
- no time window
- no observation point
- generic investment advice

## Failure Handling

Use a three-layer strategy:

1. initial insight generation
2. local validation and one targeted repair pass for invalid items
3. rule-based fallback if repair still fails

Fallback still must generate all four fields.

## Rendering Change

Daily report item layout:

- title uses the real news title
- `oneLiner` stays as a short subtitle / decision hook
- body renders:
  - `事实：`
  - `影响：`
  - `判断：`
  - `动作：`

The category overview should prefer the real title over the previous generic
`oneLiner`, because the title is more stable as a headline index.

## Downstream Compatibility

`platforms` and `podcast` currently consume `insight.content`.

Keep `content` as the joined four-grid text:

- `事实：...`
- `影响：...`
- `判断：...`
- `动作：...`

This avoids a broader refactor while immediately improving downstream copy
quality.

## Testing

Verify with:

- `npm test`
- `npx tsc --noEmit`
- `npx tsx graph.ts --resume-from-raw 2026-03-27`

Success criteria:

- no JSON parse failure in `insight`
- no item rendered with “入选原因” style filler
- each item shows all four fields
- `action` contains a time window and an observable signal
