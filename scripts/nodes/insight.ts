import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import {
  buildFallbackDisplayTitle,
  buildFallbackSections,
  buildInsightContent,
  computeDailyInsightTarget,
  isWeakEventNarrative,
  sanitizeDisplayTitle,
  sanitizeInsightSections,
  sanitizeOneLiner,
  shouldWriteInterpretation,
} from "../lib/insight-format.js";
import {
  CATEGORIES,
  categorySystemPrompt,
  categoryUserPrompt,
} from "../lib/prompts.js";
import type { NewsInsight, ScoredNewsItem } from "../lib/types.js";

interface InsightResult {
  id: string;
  displayTitle: string;
  oneLiner: string;
  event: string;
  interpretation?: string;
}

interface CategoryResult {
  id: string;
  category: string;
  confidence: number;
  reason: string;
}

const REPAIR_BATCH_SIZE = 6;
const SENSITIVE_REPAIR_PATTERN = /成人|色情|裸露|未成年人|自杀|性侵|身亡/i;

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

function buildInsightSystemPrompt(
  agenda: PipelineStateType["editorialAgenda"]
): string {
  const agendaLines = [
    agenda.dominantNarrative ? `- 今日主线：${agenda.dominantNarrative}` : "",
    agenda.openingAngle ? `- 开篇判断：${agenda.openingAngle}` : "",
    agenda.closingOutlookAngle ? `- 结尾展望：${agenda.closingOutlookAngle}` : "",
    agenda.mustCoverThemes.length > 0
      ? `- 必须覆盖主题：${agenda.mustCoverThemes.join("；")}`
      : "",
    agenda.watchSignals.length > 0
      ? `- 后续观察信号：${agenda.watchSignals.join("；")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `你是个人日报的深度编辑，服务对象是同时关心 AI、产品、研发和投资判断的中文读者。你现在需要为每条新闻生成结构化结果。

今日日报的编务判断：
${agendaLines}

硬性要求：
- displayTitle：中文短标题，12-28 个字，适合放进目录和正文标题
- displayTitle 不要照抄英文原题，不要写成完整摘要，不要带“来源”“评分”等元信息
- oneLiner：中文单句，20-32 个字，可用于摘要或分发，但不要与标题重复
- event：中文，直接写发生了什么，不要写“值得看”“媒体报道了”“出现了一条动态”
- interpretation：中文，只有在证据足够时才写；如果信息太薄、把握不够或只是论坛讨论，返回空字符串
- interpretation 必须落到一个具体变量或决策含义，例如入口、审核周期、估值锚点、监管边界、利率路径、成本结构、供给、产能、默认分发权
- 禁止使用“信号强”“信息可靠”“影响深远”“相关度高”“有实质信息”这类空话
- 不给投资建议，不写英文整句；专有名词可保留，但整句表达必须是中文

输出必须是 JSON 数组，每项包含：
- id
- displayTitle
- oneLiner
- event
- interpretation`;
}

function buildInsightUserPrompt(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    source: string;
    category: string;
    weightedScore: number;
    contentSource?: string;
  }>
): string {
  const body = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}" (评分: ${item.weightedScore})\n` +
        `标题: ${item.title}\n` +
        `分类: ${item.category}\n` +
        `来源: ${item.source}\n` +
        `内容来源: ${item.contentSource ?? "summary"}\n` +
        `摘要: ${item.summary.replace(/\s+/g, " ").trim().slice(0, 240)}\n` +
        `正文摘录: ${item.content.replace(/\s+/g, " ").trim().slice(0, 900)}`
    )
    .join("\n\n---\n\n");

  return `请为以下 ${items.length} 条新闻生成结构化解读。

要求：
- displayTitle：12-28 个中文字符，简洁概括事件，不要直接保留英文标题
- oneLiner：20-32 个中文字符
- event：45-90 个中文字符
- interpretation：0-140 个中文字符；如果拿不准就返回空字符串
- interpretation 必须具体，不要写“影响深远”“信号强”“信息可靠”“相关度高”
- 不要输出 Markdown，不要解释你的做法，只返回 JSON

新闻列表：
${body}`;
}

function buildRepairSystemPrompt(
  agenda: PipelineStateType["editorialAgenda"]
): string {
  const agendaLines = [
    agenda.dominantNarrative ? `- 今日主线：${agenda.dominantNarrative}` : "",
    agenda.mustCoverThemes.length > 0
      ? `- 必须覆盖主题：${agenda.mustCoverThemes.join("；")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `你是个人日报的资深编辑，负责修复不合格的单条解读。你会收到标题、来源、摘要、正文摘录，以及当前草稿。请把输出修成能直接发日报的中文版本。

要求：
- displayTitle 改成更短、更清晰的中文标题，适合目录导航和正文阅读
- event 必须直接写发生了什么，不要写“某媒体报道”“出现了一条动态”
- interpretation 只在有足够把握时才写；要说明哪个变量变了，或对 AI / 产品 / 研发 / 投资判断意味着什么
- interpretation 至少落到一个具体点：系统入口、审核周期、估值锚点、监管边界、成本结构、科研验证周期、利率路径、默认分发权
- interpretation 不能只是“对某领域有影响”
- 禁止使用“信号强”“信息可靠”“影响深远”“相关度高”“有实质信息”这类空话
- 如果信息不足或拿不准，interpretation 返回空字符串
- 允许保留英文专有名词，但整句必须以中文为主

今日日报主线：
${agendaLines}

输出必须是 JSON 数组，每项包含：
- id
- displayTitle
- oneLiner
- event
- interpretation`;
}

function buildRepairUserPrompt(
  items: Array<{
    id: string;
    title: string;
    source: string;
    summary: string;
    content: string;
    currentDisplayTitle: string;
    currentOneLiner: string;
    currentEvent: string;
    currentInterpretation?: string;
  }>
): string {
  const body = items
    .map(
      (item, index) =>
        `[${index + 1}] id="${item.id}"\n` +
        `标题: ${item.title}\n` +
        `来源: ${item.source}\n` +
        `摘要: ${item.summary.replace(/\s+/g, " ").trim().slice(0, 220)}\n` +
        `正文摘录: ${item.content.replace(/\s+/g, " ").trim().slice(0, 900)}\n` +
        `当前标题: ${item.currentDisplayTitle}\n` +
        `当前一句话: ${item.currentOneLiner}\n` +
        `当前事件草稿: ${item.currentEvent}\n` +
        `当前解读草稿: ${item.currentInterpretation ?? ""}`
    )
    .join("\n\n---\n\n");

  return `下面这些条目当前草稿不合格，请只重写成更好的中文版。如果信息不够，请把 interpretation 留空，不要硬写。

条目列表：
${body}`;
}

async function requestInsights(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    source: string;
    category: string;
    weightedScore: number;
    contentSource?: string;
  }>,
  agenda: PipelineStateType["editorialAgenda"]
): Promise<InsightResult[]> {
  const results = await callLLMJson<InsightResult[]>({
    systemPrompt: buildInsightSystemPrompt(agenda),
    prompt: buildInsightUserPrompt(items),
    model: "pro",
    jsonSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          displayTitle: { type: "STRING" },
          oneLiner: { type: "STRING" },
          event: { type: "STRING" },
          interpretation: { type: "STRING" },
        },
        required: ["id", "displayTitle", "oneLiner", "event", "interpretation"],
      },
    },
  });

  return extractArrayResults<InsightResult>(results);
}

async function requestRepairInsights(
  items: Array<{
    id: string;
    title: string;
    source: string;
    summary: string;
    content: string;
    currentDisplayTitle: string;
    currentOneLiner: string;
    currentEvent: string;
    currentInterpretation?: string;
  }>,
  agenda: PipelineStateType["editorialAgenda"]
): Promise<InsightResult[]> {
  if (!items.length) {
    return [];
  }

  const batches: typeof items[] = [];
  for (let index = 0; index < items.length; index += REPAIR_BATCH_SIZE) {
    batches.push(items.slice(index, index + REPAIR_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        const response = await callLLMJson<InsightResult[]>({
          systemPrompt: buildRepairSystemPrompt(agenda),
          prompt: buildRepairUserPrompt(batch),
          model: "pro",
          jsonSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                displayTitle: { type: "STRING" },
                oneLiner: { type: "STRING" },
                event: { type: "STRING" },
                interpretation: { type: "STRING" },
              },
              required: ["id", "displayTitle", "oneLiner", "event", "interpretation"],
            },
          },
        });

        return extractArrayResults<InsightResult>(response);
      } catch (error) {
        console.warn(
          "[insight] Repair batch failed, keeping first-pass drafts:",
          (error as Error).message
        );
        return [];
      }
    })
  );

  return results.flat();
}

function mergeSecondaryItems(
  existingSecondaryItems: PipelineStateType["secondaryItems"],
  demotedCandidates: ScoredNewsItem[]
): ScoredNewsItem[] {
  const merged = [...demotedCandidates, ...existingSecondaryItems];
  const seen = new Set<string>();
  return merged
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((left, right) => right.weightedScore - left.weightedScore);
}

function buildFallbackInsight(item: ScoredNewsItem): NewsInsight {
  const sections = buildFallbackSections(item);
  return {
    id: item.id,
    title: item.title,
    displayTitle: buildFallbackDisplayTitle(item),
    url: item.url,
    source: item.source,
    category: item.category,
    publishedAt: item.publishedAt,
    oneLiner: sanitizeOneLiner(undefined, item.title),
    event: sections.event,
    interpretation: sections.interpretation,
    content: buildInsightContent(sections),
    imageUrl: item.imageUrl,
    scores: item.scores,
    weightedScore: item.weightedScore,
  };
}

function shouldKeepAsDeepDive(
  item: ScoredNewsItem,
  event: string,
  interpretation: string | undefined
): boolean {
  return (
    shouldWriteInterpretation(item) &&
    !isWeakEventNarrative(event) &&
    Boolean(interpretation?.trim())
  );
}

function finalizeInsights(
  scoredItems: ScoredNewsItem[],
  candidateInsights: NewsInsight[],
  configTopN: number,
  existingSecondaryItems: PipelineStateType["secondaryItems"]
): Pick<PipelineStateType, "insights" | "secondaryItems"> {
  const itemMap = new Map(scoredItems.map((item) => [item.id, item]));
  const eligibleInsights = candidateInsights.filter((insight) =>
    shouldKeepAsDeepDive(
      itemMap.get(insight.id)!,
      insight.event,
      insight.interpretation
    )
  );

  const targetCount = Math.min(
    computeDailyInsightTarget(configTopN, eligibleInsights),
    eligibleInsights.length
  );

  const finalInsights = eligibleInsights
    .sort((left, right) => right.weightedScore - left.weightedScore)
    .slice(0, targetCount);

  const finalInsightIds = new Set(finalInsights.map((item) => item.id));
  const demotedCandidates = scoredItems.filter((item) => !finalInsightIds.has(item.id));

  return {
    insights: finalInsights,
    secondaryItems: mergeSecondaryItems(existingSecondaryItems, demotedCandidates),
  };
}

export async function insightNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems, editorialAgenda, secondaryItems, config } = state;
  if (!scoredItems.length || !config) {
    return { insights: [] };
  }

  try {
    const insightInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary ?? item.content,
      content: item.content,
      source: item.source,
      category: item.category,
      weightedScore: item.weightedScore,
      contentSource: item.contentSource,
    }));

    const categoryInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
    }));

    console.log(
      `[insight] Generating event/interpretation for ${insightInput.length} candidates...`
    );

    const [insightResults, categoryResults] = await Promise.all([
      requestInsights(insightInput, editorialAgenda),
      callLLMJson<CategoryResult[]>({
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
      }),
    ]);

    const insightMap = new Map(insightResults.map((item) => [item.id, item]));
    const categoryMap = new Map(
      extractArrayResults<CategoryResult>(categoryResults).map((item) => [item.id, item])
    );

    let candidateInsights = scoredItems.map((item) => {
      const llmResult = insightMap.get(item.id);
      const fallbackSections = buildFallbackSections(item);
      const sections = sanitizeInsightSections(
        item.title,
        {
          event: llmResult?.event ?? fallbackSections.event,
          interpretation: llmResult?.interpretation ?? fallbackSections.interpretation,
        },
        fallbackSections,
        shouldWriteInterpretation(item)
      );

      const category = categoryMap.get(item.id)?.category || item.category;
      const normalizedInterpretation = sections.interpretation?.trim() || undefined;

      return {
        id: item.id,
        title: item.title,
        displayTitle: sanitizeDisplayTitle(llmResult?.displayTitle, item),
        url: item.url,
        source: item.source,
        category,
        publishedAt: item.publishedAt,
        oneLiner: sanitizeOneLiner(llmResult?.oneLiner, item.title),
        event: sections.event,
        interpretation: normalizedInterpretation,
        content: buildInsightContent(sections),
        imageUrl: item.imageUrl,
        scores: item.scores,
        weightedScore: item.weightedScore,
      } satisfies NewsInsight;
    });

    const repairCandidates = candidateInsights
      .map((insight) => ({
        insight,
        item: scoredItems.find((candidate) => candidate.id === insight.id)!,
      }))
      .filter(
        ({ insight, item }) =>
          shouldWriteInterpretation(item) &&
          !SENSITIVE_REPAIR_PATTERN.test(`${item.title}\n${item.content}`) &&
          (isWeakEventNarrative(insight.event) || !insight.interpretation)
      )
      .sort((left, right) => right.item.weightedScore - left.item.weightedScore)
      .slice(0, 16);

    if (repairCandidates.length > 0) {
      console.log(
        `[insight] Repairing ${repairCandidates.length} borderline candidates...`
      );

      const repairResults = await requestRepairInsights(
        repairCandidates.map(({ insight, item }) => ({
          id: item.id,
          title: item.title,
          source: item.source,
          summary: item.summary ?? item.content,
          content: item.content,
          currentDisplayTitle: insight.displayTitle,
          currentOneLiner: insight.oneLiner,
          currentEvent: insight.event,
          currentInterpretation: insight.interpretation,
        })),
        editorialAgenda
      );

      if (repairResults.length > 0) {
        const repairMap = new Map(repairResults.map((item) => [item.id, item]));
        candidateInsights = scoredItems.map((item) => {
          const current = candidateInsights.find((candidate) => candidate.id === item.id)!;
          const repair = repairMap.get(item.id);
          if (!repair) return current;

          const fallbackSections = buildFallbackSections(item);
          const sections = sanitizeInsightSections(
            item.title,
            {
              event: repair.event,
              interpretation: repair.interpretation,
            },
            fallbackSections,
            shouldWriteInterpretation(item)
          );

          const normalizedInterpretation = sections.interpretation?.trim() || undefined;

          return {
            ...current,
            displayTitle: sanitizeDisplayTitle(
              repair.displayTitle || current.displayTitle,
              item
            ),
            oneLiner: sanitizeOneLiner(repair.oneLiner || current.oneLiner, item.title),
            event: sections.event,
            interpretation: normalizedInterpretation,
            content: buildInsightContent(sections),
          };
        });
      }
    }

    const finalState = finalizeInsights(
      scoredItems,
      candidateInsights,
      config.topN,
      secondaryItems
    );

    const categoryCounts = new Map<string, number>();
    for (const insight of finalState.insights) {
      categoryCounts.set(
        insight.category,
        (categoryCounts.get(insight.category) ?? 0) + 1
      );
    }

    console.log("[insight] Category distribution:", Object.fromEntries(categoryCounts));
    const demotedCount = scoredItems.length - finalState.insights.length;
    console.log(
      `[insight] Generated ${finalState.insights.length} deep dives, demoted ${demotedCount} candidates into more 24h news pool`
    );

    return finalState;
  } catch (err) {
    console.error("[insight] Failed:", err);

    const fallbackCandidates = scoredItems.map((item) => buildFallbackInsight(item));
    const finalState = finalizeInsights(
      scoredItems,
      fallbackCandidates,
      config.topN,
      secondaryItems
    );

    return {
      ...finalState,
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
