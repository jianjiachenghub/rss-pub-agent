import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import {
  buildFallbackSections,
  buildInsightContent,
  getInvalidInsightFields,
  sanitizeInsightSections,
  sanitizeOneLiner,
} from "../lib/insight-format.js";
import { CATEGORIES, categorySystemPrompt, categoryUserPrompt } from "../lib/prompts.js";
import type { NewsInsight } from "../lib/types.js";

interface InsightResult {
  id: string;
  oneLiner: string;
  fact: string;
  impact: string;
  judgment: string;
  action: string;
  imageUrl?: string;
  codeSnippet?: { lang: string; code: string } | null;
  comparisonTable?: { headers: string[]; rows: string[][] } | null;
}

interface CategoryResult {
  id: string;
  category: string;
  confidence: number;
  reason: string;
}

function extractArrayResults<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "object" && value !== null) {
    const arrayValue = Object.values(value).find((item) => Array.isArray(item));
    if (arrayValue) {
      return arrayValue as T[];
    }
  }

  return [];
}

function buildInsightSystemPrompt(agenda: PipelineStateType["editorialAgenda"]): string {
  const agendaLines = [
    agenda.dominantNarrative ? `- 今日主线：${agenda.dominantNarrative}` : "",
    agenda.openingAngle ? `- 开篇判断：${agenda.openingAngle}` : "",
    agenda.closingOutlookAngle ? `- 收尾展望：${agenda.closingOutlookAngle}` : "",
    agenda.mustCoverThemes.length > 0
      ? `- 必须覆盖主题：${agenda.mustCoverThemes.join("；")}`
      : "",
    agenda.watchSignals.length > 0
      ? `- 后续观察信号：${agenda.watchSignals.join("；")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `你是个人日报的深度编辑，服务对象是同时关心 AI、产品、研发和投资判断的读者。
你的任务不是解释“为什么这条新闻入选”，也不是把每条写成宏大趋势评论，而是把单条新闻写成可用于更新判断的四格分析。

今日日报的编务判断：
${agendaLines}

每条新闻必须输出这些字段：
- oneLiner：20-32 个汉字，作为概览区的一句话决策钩子
- fact：40-70 个汉字，直接说明发生了什么
- impact：50-90 个汉字，只写最相关的 1-2 个视角，可写成“对产品：... 对研发：...”
- judgment：50-90 个汉字，说清哪个变量变了，例如入口、监管预期、资金流向、供给格局、研发成本
- action：40-80 个汉字，必须包含时间窗和观察点，例如“未来 1-2 周盯 ... 是否披露/上线/扩大”

硬性要求：
- 不要写“为什么值得看”“入选原因”“这条新闻讲的是”这种句式
- fact 不能只是把标题换个说法
- impact 不要四个视角全写，只写最相关的 1-2 个
- judgment 不能重复 impact，必须点明变量变化
- action 不能写“持续关注后续进展”，必须具体、可观察、与读者决策相关
- 不要给投资建议，只给判断更新和观察动作
- 如果没有 codeSnippet / comparisonTable / imageUrl，就返回空字符串或 null

输出要求：
- 返回 JSON 数组
- 每项包含 id / oneLiner / fact / impact / judgment / action / imageUrl / codeSnippet / comparisonTable`;
}

function buildInsightUserPrompt(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    category: string;
    weightedScore: number;
  }[],
  invalidFieldsById?: Map<string, string[]>
): string {
  const itemsText = items
    .map((item, index) => {
      const failedFields = invalidFieldsById?.get(item.id);
      const repairHint =
        failedFields && failedFields.length > 0
          ? `\n上一次失败字段: ${failedFields.join(", ")}`
          : "";

      return (
        `[${index + 1}] id="${item.id}" (评分: ${item.weightedScore})\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `来源: ${item.source}\n` +
        `内容摘录: ${item.content.replace(/\s+/g, " ").trim().slice(0, 420)}${repairHint}`
      );
    })
    .join("\n\n---\n\n");

  const repairInstruction =
    invalidFieldsById && invalidFieldsById.size > 0
      ? `\n\n这是修复重写，不合格字段必须重写到可直接给读者使用。`
      : "";

  return `请为以下 ${items.length} 条高优先级新闻生成结构化单条解读。

输出必须是 JSON 数组，每个对象都对应一条新闻。
每条都按四格写：
- fact：先讲事件本身，不要复述标题空话
- impact：只写这条新闻最相关的 1-2 个视角
- judgment：明确哪个变量变了
- action：给出未来 1-2 周或相近时间窗内要盯的观察信号

不要输出“入选原因”式的句子，不要泛泛而谈，不要写成投资建议。${repairInstruction}

新闻列表：

${itemsText}`;
}

async function requestInsights(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    category: string;
    weightedScore: number;
  }[],
  agenda: PipelineStateType["editorialAgenda"],
  invalidFieldsById?: Map<string, string[]>
): Promise<InsightResult[]> {
  const results = await callLLMJson<InsightResult[]>({
    systemPrompt: buildInsightSystemPrompt(agenda),
    prompt: buildInsightUserPrompt(items, invalidFieldsById),
    model: "pro",
    jsonSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          oneLiner: { type: "STRING" },
          fact: { type: "STRING" },
          impact: { type: "STRING" },
          judgment: { type: "STRING" },
          action: { type: "STRING" },
          imageUrl: { type: "STRING" },
          codeSnippet: {
            type: "OBJECT",
            properties: {
              lang: { type: "STRING" },
              code: { type: "STRING" },
            },
          },
          comparisonTable: {
            type: "OBJECT",
            properties: {
              headers: { type: "ARRAY", items: { type: "STRING" } },
              rows: {
                type: "ARRAY",
                items: { type: "ARRAY", items: { type: "STRING" } },
              },
            },
          },
        },
        required: ["id", "oneLiner", "fact", "impact", "judgment", "action"],
      },
    },
  });

  return extractArrayResults<InsightResult>(results);
}

function buildFallbackInsight(
  item: PipelineStateType["scoredItems"][number]
): NewsInsight {
  const sections = buildFallbackSections(item);
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    source: item.source,
    category: item.category,
    publishedAt: item.publishedAt,
    oneLiner: sanitizeOneLiner(undefined, item.title),
    fact: sections.fact,
    impact: sections.impact,
    judgment: sections.judgment,
    action: sections.action,
    content: buildInsightContent(sections),
    scores: item.scores,
    weightedScore: item.weightedScore,
  };
}

function buildFallbackInsights(state: PipelineStateType): NewsInsight[] {
  return state.scoredItems.map((item) => buildFallbackInsight(item));
}

function collectInvalidFields(
  items: PipelineStateType["scoredItems"],
  insightMap: Map<string, InsightResult>
): Map<string, string[]> {
  const invalidFieldsById = new Map<string, string[]>();

  for (const item of items) {
    const insight = insightMap.get(item.id);
    if (!insight) {
      invalidFieldsById.set(item.id, ["fact", "impact", "judgment", "action"]);
      continue;
    }

    const invalidFields = getInvalidInsightFields(item.title, {
      fact: insight.fact,
      impact: insight.impact,
      judgment: insight.judgment,
      action: insight.action,
    });

    if (invalidFields.length > 0) {
      invalidFieldsById.set(item.id, invalidFields);
    }
  }

  return invalidFieldsById;
}

export async function insightNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems, editorialAgenda } = state;
  if (!scoredItems.length) {
    return { insights: [] };
  }

  try {
    const batchInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
      category: item.category,
      weightedScore: item.weightedScore,
    }));

    console.log(`[insight] Generating insights for ${batchInput.length} items...`);

    const initialResults = await requestInsights(batchInput, editorialAgenda);
    const insightMap = new Map(initialResults.map((result) => [result.id, result]));
    const invalidFieldsById = collectInvalidFields(scoredItems, insightMap);

    if (invalidFieldsById.size > 0) {
      console.warn(
        `[insight] Repairing ${invalidFieldsById.size} items with weak fields`
      );

      const repairItems = batchInput.filter((item) => invalidFieldsById.has(item.id));
      const repairedResults = await requestInsights(
        repairItems,
        editorialAgenda,
        invalidFieldsById
      );

      for (const result of repairedResults) {
        insightMap.set(result.id, result);
      }
    }

    const categoryInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
    }));

    const categoryResults = await callLLMJson<CategoryResult[]>({
      systemPrompt: categorySystemPrompt(),
      prompt: categoryUserPrompt(categoryInput),
      model: "flash",
      jsonSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            category: { type: "STRING", enum: CATEGORIES },
            confidence: { type: "NUMBER" },
            reason: { type: "STRING" },
          },
          required: ["id", "category", "confidence", "reason"],
        },
      },
    });

    const categoryArray = extractArrayResults<CategoryResult>(categoryResults);
    const categoryMap = new Map(categoryArray.map((result) => [result.id, result]));

    const insights = scoredItems.map((item) => {
      const insight = insightMap.get(item.id);
      const categoryResult = categoryMap.get(item.id);
      const fallbackSections = buildFallbackSections(item);
      const sections = insight
        ? sanitizeInsightSections(
            item.title,
            {
              fact: insight.fact,
              impact: insight.impact,
              judgment: insight.judgment,
              action: insight.action,
            },
            fallbackSections
          )
        : fallbackSections;

      return {
        id: item.id,
        title: item.title,
        url: item.url,
        source: item.source,
        category: categoryResult?.category || item.category,
        publishedAt: item.publishedAt,
        oneLiner: sanitizeOneLiner(insight?.oneLiner, item.title),
        fact: sections.fact,
        impact: sections.impact,
        judgment: sections.judgment,
        action: sections.action,
        content: buildInsightContent(sections),
        imageUrl: insight?.imageUrl || undefined,
        codeSnippet: insight?.codeSnippet ?? undefined,
        comparisonTable: insight?.comparisonTable ?? undefined,
        scores: item.scores,
        weightedScore: item.weightedScore,
      } satisfies NewsInsight;
    });

    const categoryCounts = new Map<string, number>();
    for (const insight of insights) {
      categoryCounts.set(
        insight.category,
        (categoryCounts.get(insight.category) ?? 0) + 1
      );
    }

    console.log("[insight] Category distribution:", Object.fromEntries(categoryCounts));
    console.log(`[insight] Generated ${insights.length} structured insights`);

    return { insights };
  } catch (err) {
    console.error("[insight] Failed:", err);
    return {
      insights: buildFallbackInsights(state),
      errors: [
        {
          node: "insight",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
