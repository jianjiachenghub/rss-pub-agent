import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import {
  buildFallbackSections,
  buildInsightContent,
  computeDailyInsightTarget,
  isWeakEventNarrative,
  sanitizeInsightSections,
  sanitizeOneLiner,
  shouldWriteInterpretation,
} from "../lib/insight-format.js";
import {
  CATEGORIES,
  categoryUserPrompt,
} from "../lib/prompts.js";
import { forumAwareCategorySystemPrompt } from "../lib/forum-aware-prompts.js";
import type { NewsInsight, ScoredNewsItem } from "../lib/types.js";

interface InsightResult {
  id: string;
  titleZh: string;
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

function looksMostlyChinese(value: string | undefined): boolean {
  const normalized = (value ?? "").replace(/\s+/g, "").trim();
  if (!normalized) return false;

  const chineseCount = normalized.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return chineseCount >= Math.max(2, Math.ceil(normalized.length * 0.3));
}

function sanitizeChineseTitle(
  rawTitleZh: string | undefined,
  fallbackTitle: string,
  fallbackOneLiner?: string
): string {
  const normalizedTitleZh = rawTitleZh?.replace(/\s+/g, " ").trim() ?? "";
  if (normalizedTitleZh) {
    return normalizedTitleZh.replace(/[。！？]+$/u, "");
  }

  const normalizedFallbackTitle = fallbackTitle.replace(/\s+/g, " ").trim();
  if (looksMostlyChinese(normalizedFallbackTitle)) {
    return normalizedFallbackTitle.replace(/[。！？]+$/u, "");
  }

  const normalizedOneLiner = fallbackOneLiner?.replace(/\s+/g, " ").trim() ?? "";
  if (normalizedOneLiner) {
    return normalizedOneLiner.replace(/[。！？]+$/u, "");
  }

  return normalizedFallbackTitle;
}

function buildInsightSystemPrompt(
  agenda: PipelineStateType["editorialAgenda"]
): string {
  const agendaLines = [
    agenda.dominantNarrative ? `- 今日主线：${agenda.dominantNarrative}` : "",
    agenda.openingAngle ? `- 开篇判断：${agenda.openingAngle}` : "",
    agenda.closingOutlookAngle ? `- 收尾展望：${agenda.closingOutlookAngle}` : "",
    agenda.mustCoverThemes.length > 0
      ? `- 必须覆盖主题：${agenda.mustCoverThemes.join("、")}`
      : "",
    agenda.watchSignals.length > 0
      ? `- 后续观察信号：${agenda.watchSignals.join("、")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `你是个人日报的深度编辑，服务对象同时关注 AI、产品、研发和投资判断。
你现在要为每条新闻输出四个字段：
- titleZh：中文新闻标题，用标题写法，不要写成摘要句
- oneLiner：一句话中文导语，说明这条新闻为什么值得看
- event：中文，直接写发生了什么（40-90 字，具体、有细节）
- interpretation：中文，写这条信息改变了哪个变量或判断（40-140 字）；如果确实没有足够信息判断才返回空字符串

今日日报的编务判断：
${agendaLines}

硬性要求：
- titleZh 必须是中文标题，可保留必要的英文专有名词、产品名、公司名
- titleZh 不要直接照抄英文原标题，不要写成”某公司宣布了……”
- oneLiner、event、interpretation 都必须是中文
- event 是日报核心内容，必须写清楚发生了什么，包含关键数字、时间、参与方等细节
- interpretation 尽量写，只在确实没有足够信息判断时才留空
- interpretation 必须点出一个具体变量或决策含义，例如入口、审核周期、估值锚点、监管边界、利率路径、成本结构
- 禁止使用”信号强””信息可靠””影响深远””相关度高””有实质信息”这类空话
- 不给投资建议，不写空泛口号

输出必须是 JSON 数组，每项包含：
- id
- titleZh
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
- titleZh：12-32 个中文字符，写成新闻标题，不要写成完整长句
- oneLiner：10-32 个中文字符
- event：25-90 个中文字符
- interpretation：40-140 个中文字符；如果拿不准就返回空字符串
- interpretation 必须具体，不要写“影响深远”“信号强”“信息可靠”“相关度高”

不要输出 Markdown，不要解释你的做法，只返回 JSON。
新闻列表：
${body}`;
}

function buildRepairSystemPrompt(
  agenda: PipelineStateType["editorialAgenda"]
): string {
  const agendaLines = [
    agenda.dominantNarrative ? `- 今日主线：${agenda.dominantNarrative}` : "",
    agenda.mustCoverThemes.length > 0
      ? `- 必须覆盖主题：${agenda.mustCoverThemes.join("、")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `你是个人日报的资深编辑，负责修复不合格的单条解读。
你会收到标题、来源、摘要、正文摘录，以及当前草稿。请把输出修成能直接发日报的中文版。

要求：
- titleZh：中文标题，允许保留英文专有名词，但不要直接照抄英文原标题
- event：必须直接写发生了什么，不要写“某媒体报道”“出现了一条动态”
- interpretation：只在有足够把握时才写；要说明哪个变量变了，或对 AI / 产品 / 研发 / 投资判断意味着什么
- interpretation 至少落到一个具体点：系统入口、审核周期、估值锚点、监管边界、成本结构、科研验证周期、利率路径、默认分发权
- interpretation 不能只是“对某领域有影响”
- 禁止使用“信号强”“信息可靠”“影响深远”“相关度高”“有实质信息”这类空话
- 如果信息不足或拿不准，interpretation 返回空字符串
- 允许保留英文专有名词，但整句必须以中文为主

今日日报主线：
${agendaLines}

输出必须是 JSON 数组，每项包含：
- id
- titleZh
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
    currentTitleZh: string;
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
        `当前中文标题: ${item.currentTitleZh}\n` +
        `当前一句话: ${item.currentOneLiner}\n` +
        `当前事件草稿: ${item.currentEvent}\n` +
        `当前解读草稿: ${item.currentInterpretation ?? ""}`
    )
    .join("\n\n---\n\n");

  return `下面这些条目当前草稿不合格，请只重写成更好的中文版。
如果信息不够，请把 interpretation 留空，不要硬写。

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
          titleZh: { type: "STRING" },
          oneLiner: { type: "STRING" },
          event: { type: "STRING" },
          interpretation: { type: "STRING" },
        },
        required: ["id", "titleZh", "oneLiner", "event", "interpretation"],
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
    currentTitleZh: string;
    currentOneLiner: string;
    currentEvent: string;
    currentInterpretation?: string;
  }>,
  agenda: PipelineStateType["editorialAgenda"]
): Promise<InsightResult[]> {
  if (!items.length) {
    return [];
  }

  // Repair runs only on drafts that failed structural/content checks. Keeping it
  // batched and separate avoids paying the "pro" rewrite cost for clean items.
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
                titleZh: { type: "STRING" },
                oneLiner: { type: "STRING" },
                event: { type: "STRING" },
                interpretation: { type: "STRING" },
              },
              required: ["id", "titleZh", "oneLiner", "event", "interpretation"],
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
  const fallbackOneLiner = sanitizeOneLiner(undefined, item.title);

  return {
    id: item.id,
    title: item.title,
    titleZh: sanitizeChineseTitle(undefined, item.title, fallbackOneLiner),
    url: item.url,
    source: item.source,
    category: item.category,
    publishedAt: item.publishedAt,
    oneLiner: fallbackOneLiner,
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
  _interpretation: string | undefined
): boolean {
  // Keep items that have a meaningful event narrative, even without interpretation.
  // Previously this required interpretation to be non-empty, which caused too many
  // high-quality items to be demoted into the secondary pool.
  return !isWeakEventNarrative(event);
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

  // Anything that scored well enough to survive scoring but not well enough to
  // become a deep dive is still valuable for the "More in the Last 24h" rail.
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

    // Category classification runs alongside insight writing so downstream layout
    // gets cleaner buckets without adding another sequential LLM stage.
    const [insightResults, categoryResults] = await Promise.all([
      requestInsights(insightInput, editorialAgenda),
      callLLMJson<CategoryResult[]>({
        systemPrompt: forumAwareCategorySystemPrompt(),
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
      const oneLiner = sanitizeOneLiner(llmResult?.oneLiner, item.title);

      return {
        id: item.id,
        title: item.title,
        titleZh: sanitizeChineseTitle(llmResult?.titleZh, item.title, oneLiner),
        url: item.url,
        source: item.source,
        category,
        publishedAt: item.publishedAt,
        oneLiner,
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
          (
            isWeakEventNarrative(insight.event) ||
            !insight.interpretation ||
            !looksMostlyChinese(insight.titleZh)
          )
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
          currentTitleZh: insight.titleZh ?? item.title,
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
            titleZh: sanitizeChineseTitle(
              repair.titleZh || current.titleZh,
              item.title,
              repair.oneLiner || current.oneLiner
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
