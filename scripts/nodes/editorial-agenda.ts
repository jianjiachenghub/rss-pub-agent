import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import {
  CATEGORIES,
  editorialAgendaSystemPrompt,
  editorialAgendaUserPrompt,
} from "../lib/prompts.js";
import { writeRawJson } from "../lib/raw-output.js";
import type { EditorialAgenda, NewsCategory, RawNewsItem } from "../lib/types.js";

const CATEGORY_SAMPLE_LIMIT = 5;
const TOTAL_SAMPLE_LIMIT = 28;

interface EditorialAgendaResult {
  dominantNarrative: string;
  openingAngle: string;
  closingOutlookAngle: string;
  mustCoverThemes: string[];
  watchSignals: string[];
  mustCoverIds: string[];
  categoryBoosts: Partial<Record<NewsCategory, number>>;
  rationale: string;
}

function buildDefaultAgenda(state: PipelineStateType): EditorialAgenda {
  const strategy = state.config?.editorial;
  return {
    dominantNarrative:
      strategy?.dailyObjective ?? "提炼当天最重要的高价值信号。",
    openingAngle:
      "今天最值得关注的，不是单条新闻数量，而是哪些变量开始同时变化。",
    closingOutlookAngle:
      "继续跟踪政策、资金、技术落地是否互相强化，才是真正决定后续走势的关键。",
    mustCoverThemes: strategy?.mustWatchThemes ?? [],
    watchSignals: (strategy?.mustWatchThemes ?? []).slice(0, 5),
    mustCoverIds: [],
    categoryBoosts: {},
    rationale: "LLM 编务判断失败，回退到基础编辑策略。",
  };
}

function pickText(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizeBoosts(
  boosts: Partial<Record<NewsCategory, number>> | undefined
): Partial<Record<NewsCategory, number>> {
  const result: Partial<Record<NewsCategory, number>> = {};
  for (const category of CATEGORIES) {
    const value = boosts?.[category];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    result[category] = Math.max(-0.35, Math.min(0.8, value));
  }
  return result;
}

function sampleAgendaItems(items: RawNewsItem[]): RawNewsItem[] {
  const byCategory = new Map<string, RawNewsItem[]>();

  for (const item of [...items].sort((a, b) => {
    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  })) {
    const category = item.category || "social";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    const bucket = byCategory.get(category)!;
    if (bucket.length < CATEGORY_SAMPLE_LIMIT) {
      bucket.push(item);
    }
  }

  return CATEGORIES.flatMap((category) => byCategory.get(category) ?? []).slice(
    0,
    TOTAL_SAMPLE_LIMIT
  );
}

export async function editorialAgendaNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { config, rawItems, coverageStats, date } = state;
  if (!config || !date) {
    return {
      errors: [
        {
          node: "editorialAgenda",
          message: "Missing config or date",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  if (!rawItems.length) {
    return { editorialAgenda: buildDefaultAgenda(state) };
  }

  const sampledItems = sampleAgendaItems(rawItems);

  try {
    // Agenda only needs a balanced sketch of the day, not the full pool. Sampling
    // by category keeps the narrative step from being dominated by the loudest feed.
    const result = await callLLMJson<EditorialAgendaResult>({
      systemPrompt: editorialAgendaSystemPrompt(
        config.editorial,
        config.interests
      ),
      prompt: editorialAgendaUserPrompt(
        sampledItems.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          source: item.source,
          category: item.category,
          publishedAt: item.publishedAt,
        })),
        coverageStats
      ),
      model: "flash",
      jsonSchema: {
        type: "OBJECT",
        properties: {
          dominantNarrative: { type: "STRING" },
          openingAngle: { type: "STRING" },
          closingOutlookAngle: { type: "STRING" },
          mustCoverThemes: { type: "ARRAY", items: { type: "STRING" } },
          watchSignals: { type: "ARRAY", items: { type: "STRING" } },
          mustCoverIds: { type: "ARRAY", items: { type: "STRING" } },
          rationale: { type: "STRING" },
          categoryBoosts: {
            type: "OBJECT",
            properties: Object.fromEntries(
              CATEGORIES.map((category) => [category, { type: "NUMBER" }])
            ),
          },
        },
        required: [
          "dominantNarrative",
          "openingAngle",
          "closingOutlookAngle",
          "mustCoverThemes",
          "watchSignals",
          "mustCoverIds",
          "rationale",
          "categoryBoosts",
        ],
      },
    });

    const validIds = new Set(rawItems.map((item) => item.id));
    const fallback = buildDefaultAgenda(state);
    const agenda: EditorialAgenda = {
      dominantNarrative: pickText(
        result.dominantNarrative,
        fallback.dominantNarrative
      ),
      openingAngle: pickText(result.openingAngle, fallback.openingAngle),
      closingOutlookAngle: pickText(
        result.closingOutlookAngle,
        fallback.closingOutlookAngle
      ),
      mustCoverThemes:
        (result.mustCoverThemes ?? []).slice(0, 5).length > 0
          ? (result.mustCoverThemes ?? []).slice(0, 5)
          : fallback.mustCoverThemes,
      watchSignals:
        (result.watchSignals ?? []).slice(0, 5).length > 0
          ? (result.watchSignals ?? []).slice(0, 5)
          : fallback.watchSignals,
      mustCoverIds: (result.mustCoverIds ?? [])
        .filter((id) => validIds.has(id))
        .slice(0, 8),
      categoryBoosts: normalizeBoosts(result.categoryBoosts),
      rationale: pickText(result.rationale, fallback.rationale),
    };

    await writeRawJson(date, "editorial-agenda.json", agenda);
    console.log(
      `[editorialAgenda] narrative="${agenda.dominantNarrative}" mustCover=${agenda.mustCoverIds.length}`
    );

    return { editorialAgenda: agenda };
  } catch (err) {
    const fallback = buildDefaultAgenda(state);
    await writeRawJson(date, "editorial-agenda.json", fallback);
    return {
      editorialAgenda: fallback,
      errors: [
        {
          node: "editorialAgenda",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
