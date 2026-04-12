# Bilingual Frontend And Daily Report Output

## Goal

Add Chinese and English support to the frontend with a navigation switcher, while keeping the implementation cost low and preserving the current Chinese-first publishing flow.

## Chosen Approach

1. Keep the existing Chinese pipeline unchanged as the source of truth.
2. After `daily.md` is generated, produce an English companion artifact `daily.en.md`.
3. Add English routes under `/en/...` instead of refactoring the whole site into a full locale router.
4. Make the frontend content loader locale-aware so English pages read `daily.en.md` and fall back to `daily.md` when no English artifact exists.

## Why This Approach

- Lowest code churn: it avoids touching the current `insight` schema, prompt contracts, and downstream platform generation.
- Preserves current URLs: Chinese pages stay where they are, and English pages are added as a parallel route tree.
- Keeps SSG: the site still renders as static pages instead of depending on runtime locale negotiation.
- Safe fallback: older archive dates without `daily.en.md` still render.

## Tradeoffs

- English output is a translation of the final curated Chinese daily report, not a first-class source-language editorial pass.
- English about-page content is intentionally lighter than the Chinese page for this slice.
- Full locale metadata and deeper i18n can be added later if needed.

## Future Upgrade Path

If English quality becomes important enough, the next step is to make `insight` emit bilingual structured fields directly and generate both `daily.md` and `daily.en.md` from the same bilingual state instead of translating the final Chinese Markdown.
