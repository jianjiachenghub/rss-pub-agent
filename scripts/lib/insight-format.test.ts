import { describe, expect, it } from "vitest";
import {
  buildFallbackSections,
  buildInsightContent,
  computeDailyInsightTarget,
  dedupeDailyInsightCandidates,
  getInvalidInsightFields,
  hasThinContent,
  isInformativeImage,
  selectDailyInsightsByCategory,
  shouldWriteInterpretation,
} from "./insight-format.js";

describe("insight-format", () => {
  it("builds compatibility content from event and interpretation", () => {
    expect(
      buildInsightContent({
        event: "苹果计划在 iOS 27 向第三方 AI 助手开放 Siri 接口。",
        interpretation:
          "这会把竞争重点从模型单点能力转到系统入口、调用频率和默认分发位置。",
      })
    ).toContain("解读：这会把竞争重点从模型单点能力转到系统入口");
  });

  it("flags generic or non-Chinese insight fields as invalid", () => {
    expect(
      getInvalidInsightFields("苹果开放 Siri 接口", {
        event:
          "The company announced a new change to Siri that may impact the market.",
        interpretation: "值得关注后续进展。",
      })
    ).toEqual(["event", "interpretation"]);
  });

  it("treats short forum questions as not suitable for interpretation", () => {
    const item = {
      title: "请问什么工具可以测数据库 C 接口的性能，以及稳定性？",
      source: "V2EX - 技术",
      content:
        "The user asks what tools can be used to test the performance and stability of an embedded database’s C API.",
      contentDepth: 104,
    };

    expect(hasThinContent(item)).toBe(true);
    expect(shouldWriteInterpretation(item)).toBe(false);
  });

  it("keeps only informative image candidates", () => {
    expect(
      isInformativeImage(
        "https://example.com/assets/model-leaderboard-chart.png",
        "这篇文章给出了模型梯队和 benchmark 对比。"
      )
    ).toBe(true);

    expect(
      isInformativeImage(
        "https://example.com/assets/company-logo.png",
        "这是一篇公司新闻。"
      )
    ).toBe(false);
  });

  it("treats the configured topN as a normal-day ceiling, not a fill target", () => {
    expect(
      computeDailyInsightTarget(20, [
        { weightedScore: 82 },
        { weightedScore: 80 },
        { weightedScore: 79 },
        { weightedScore: 78 },
        { weightedScore: 77 },
        { weightedScore: 76 },
        { weightedScore: 75 },
        { weightedScore: 74 },
        { weightedScore: 74 },
        { weightedScore: 73 },
        { weightedScore: 72 },
        { weightedScore: 71 },
        { weightedScore: 70 },
        { weightedScore: 69 },
        { weightedScore: 69 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
        { weightedScore: 68 },
      ])
    ).toBe(7);
  });

  it("keeps routine inflated scoring in the teens instead of filling the cap", () => {
    expect(
      computeDailyInsightTarget(20, [
        { weightedScore: 93 },
        { weightedScore: 89 },
        { weightedScore: 89 },
        { weightedScore: 87 },
        { weightedScore: 85 },
        { weightedScore: 84 },
        { weightedScore: 83 },
        { weightedScore: 93 },
        { weightedScore: 83 },
        { weightedScore: 83 },
        { weightedScore: 81 },
        { weightedScore: 88 },
        { weightedScore: 89 },
        { weightedScore: 87 },
        { weightedScore: 85 },
        { weightedScore: 82 },
        { weightedScore: 82 },
        { weightedScore: 81 },
        { weightedScore: 80 },
        { weightedScore: 80 },
        { weightedScore: 79 },
        { weightedScore: 93 },
        { weightedScore: 92 },
        { weightedScore: 91 },
        { weightedScore: 88 },
        { weightedScore: 87 },
        { weightedScore: 86 },
        { weightedScore: 85 },
        { weightedScore: 84 },
        { weightedScore: 79 },
      ])
    ).toBe(17);
  });

  it("lets genuinely high-density days approach the normal cap", () => {
    expect(
      computeDailyInsightTarget(20, [
        { weightedScore: 98 },
        { weightedScore: 93 },
        { weightedScore: 92 },
        { weightedScore: 92 },
        { weightedScore: 91 },
        { weightedScore: 91 },
        { weightedScore: 90 },
        { weightedScore: 90 },
        { weightedScore: 89 },
        { weightedScore: 88 },
        { weightedScore: 88 },
        { weightedScore: 87 },
        { weightedScore: 86 },
        { weightedScore: 85 },
        { weightedScore: 84 },
        { weightedScore: 84 },
        { weightedScore: 83 },
        { weightedScore: 83 },
        { weightedScore: 81 },
        { weightedScore: 81 },
        { weightedScore: 80 },
        { weightedScore: 79 },
        { weightedScore: 77 },
        { weightedScore: 77 },
        { weightedScore: 76 },
        { weightedScore: 75 },
        { weightedScore: 74 },
        { weightedScore: 73 },
        { weightedScore: 72 },
        { weightedScore: 70 },
      ])
    ).toBe(14);
  });

  it("allows 30 deep dives only on exceptional news days", () => {
    expect(
      computeDailyInsightTarget(18, [
        { weightedScore: 100 },
        { weightedScore: 99 },
        { weightedScore: 98 },
        { weightedScore: 97 },
        { weightedScore: 96 },
        { weightedScore: 95 },
        { weightedScore: 94 },
        { weightedScore: 93 },
        { weightedScore: 92 },
        { weightedScore: 92 },
        { weightedScore: 91 },
        { weightedScore: 91 },
        { weightedScore: 90 },
        { weightedScore: 90 },
        { weightedScore: 90 },
        { weightedScore: 90 },
        { weightedScore: 89 },
        { weightedScore: 89 },
        { weightedScore: 88 },
        { weightedScore: 88 },
        { weightedScore: 87 },
        { weightedScore: 87 },
        { weightedScore: 86 },
        { weightedScore: 86 },
        { weightedScore: 85 },
        { weightedScore: 85 },
        { weightedScore: 84 },
        { weightedScore: 84 },
        { weightedScore: 84 },
        { weightedScore: 84 },
      ])
    ).toBe(30);
  });

  it("selects high-scoring items by category instead of global score order", () => {
    const selected = selectDailyInsightsByCategory(
      [
        { id: "ai-99", category: "ai", weightedScore: 99 },
        { id: "ai-98", category: "ai", weightedScore: 98 },
        { id: "ai-97", category: "ai", weightedScore: 97 },
        { id: "ai-96", category: "ai", weightedScore: 96 },
        { id: "ai-95", category: "ai", weightedScore: 95 },
        { id: "ai-94", category: "ai", weightedScore: 94 },
        { id: "investment-93", category: "investment", weightedScore: 93 },
        { id: "investment-92", category: "investment", weightedScore: 92 },
        { id: "software-91", category: "software", weightedScore: 91 },
        { id: "business-89", category: "business", weightedScore: 89 },
        { id: "politics-79", category: "politics", weightedScore: 79 },
      ],
      8
    );

    const ids = selected.map((item) => item.id);

    expect(ids).toContain("software-91");
    expect(ids).toContain("business-89");
    expect(ids).not.toContain("politics-79");
    expect(ids.filter((id) => id.startsWith("ai-"))).toHaveLength(4);
    expect(selected).toHaveLength(8);
  });

  it("dedupes same-event candidates across categories before daily selection", () => {
    const unique = dedupeDailyInsightCandidates([
      {
        id: "politics-fed",
        title: "特朗普阵营再攻美联储架构",
        titleZh: "特朗普阵营再攻美联储架构",
        event:
          "特朗普盟友继续推进重塑美联储的努力，焦点围绕理事席位和制度权力。",
        category: "politics",
        weightedScore: 91,
      },
      {
        id: "investment-fed",
        title: "特朗普盟友加码重塑美联储",
        titleZh: "特朗普盟友加码重塑美联储",
        event:
          "最高法院阻止罢免Lisa Cook后，特朗普盟友继续推进重塑美联储的努力。",
        category: "investment",
        weightedScore: 93,
      },
      {
        id: "openai-science",
        title: "OpenAI发布科研工作台",
        titleZh: "OpenAI发布科研工作台",
        event: "OpenAI推出面向科研人员的新产品工作台。",
        category: "ai",
        weightedScore: 90,
      },
    ]);

    expect(unique.map((item) => item.id)).toEqual([
      "investment-fed",
      "openai-science",
    ]);
  });

  it("fills the daily list with the next unique item when a duplicate is removed", () => {
    const selected = selectDailyInsightsByCategory(
      [
        {
          id: "ai-1",
          title: "OpenAI发布科研工作台",
          titleZh: "OpenAI发布科研工作台",
          event: "OpenAI推出面向科研人员的新产品工作台。",
          category: "ai",
          weightedScore: 94,
        },
        {
          id: "politics-fed",
          title: "特朗普阵营再攻美联储架构",
          titleZh: "特朗普阵营再攻美联储架构",
          event:
            "特朗普盟友继续推进重塑美联储的努力，焦点围绕理事席位和制度权力。",
          category: "politics",
          weightedScore: 92,
        },
        {
          id: "investment-fed",
          title: "特朗普盟友加码重塑美联储",
          titleZh: "特朗普盟友加码重塑美联储",
          event:
            "最高法院阻止罢免Lisa Cook后，特朗普盟友继续推进重塑美联储的努力。",
          category: "investment",
          weightedScore: 93,
        },
        {
          id: "investment-unique",
          title: "美欧央行政策分化预期升温",
          titleZh: "美欧央行政策分化预期升温",
          event: "交易员重新定价美欧央行政策路径差异。",
          category: "investment",
          weightedScore: 88,
        },
        {
          id: "business-unique",
          title: "OpenAI拟让渡政府股权",
          titleZh: "OpenAI拟让渡政府股权",
          event: "OpenAI向美国政府提出持有公司股权的方案。",
          category: "business",
          weightedScore: 87,
        },
        {
          id: "software-unique",
          title: "开发者工具发布新版本",
          titleZh: "开发者工具发布新版本",
          event: "一个开发者工具发布新版本并改善本地编码工作流。",
          category: "software",
          weightedScore: 86,
        },
        {
          id: "tech-unique",
          title: "美国电网遭遇AI用电压力测试",
          titleZh: "美国电网遭遇AI用电压力测试",
          event: "AI数据中心用电需求继续给美国电网带来压力。",
          category: "tech",
          weightedScore: 86,
        },
        {
          id: "ai-2",
          title: "Anthropic洽谈定制芯片",
          titleZh: "Anthropic洽谈定制芯片",
          event: "Anthropic与芯片厂商洽谈面向模型训练的定制芯片。",
          category: "ai",
          weightedScore: 85,
        },
      ],
      8
    );

    const ids = selected.map((item) => item.id);

    expect(ids).toContain("investment-fed");
    expect(ids).not.toContain("politics-fed");
    expect(ids).toContain("investment-unique");
    expect(selected).toHaveLength(7);
  });

  it("does not merge different actors just because they mention the same product", () => {
    const unique = dedupeDailyInsightCandidates([
      {
        id: "anthropic-china-access",
        title: "Anthropic收紧中国用户访问",
        titleZh: "Anthropic收紧中国用户访问",
        event: "Anthropic开始限制中国用户访问Claude服务。",
        category: "ai",
        weightedScore: 93,
      },
      {
        id: "alibaba-claude-ban",
        title: "阿里全员禁用Claude产品",
        titleZh: "阿里全员禁用Claude产品",
        event: "阿里内部要求员工停止使用Claude相关产品。",
        category: "ai",
        weightedScore: 89,
      },
    ]);

    expect(unique.map((item) => item.id)).toEqual([
      "anthropic-china-access",
      "alibaba-claude-ban",
    ]);
  });

  it("dedupes same-person central-bank succession stories with different wording", () => {
    const unique = dedupeDailyInsightCandidates([
      {
        id: "lagarde-ecb-exit",
        title: "拉加德暗示或提前离开ECB",
        titleZh: "拉加德暗示或提前离开ECB",
        event: "拉加德暗示可能提前离开欧洲央行，转向法国政坛。",
        category: "politics",
        weightedScore: 86,
      },
      {
        id: "lagarde-france-politics",
        title: "拉加德或转向法国政坛",
        titleZh: "拉加德或转向法国政坛",
        event: "拉加德可能提前结束欧洲央行任期并进入法国政治安排。",
        category: "politics",
        weightedScore: 85,
      },
    ]);

    expect(unique.map((item) => item.id)).toEqual(["lagarde-ecb-exit"]);
  });

  it("builds conservative fallback content for thin items", () => {
    const fallback = buildFallbackSections({
      title: "请问什么工具可以测数据库 C 接口的性能，以及稳定性？",
      content:
        "The user asks what tools can be used to test the performance and stability of an embedded database’s C API.",
      category: "software",
      source: "V2EX - 技术",
      scoreReasoning: "和工程实践相关，但原始内容较薄。",
      contentDepth: 104,
    });

    expect(fallback.event).toContain("V2EX");
    expect(fallback.interpretation).toBeUndefined();
  });
  it("accepts structured score reasoning without crashing fallback generation", () => {
    const fallback = buildFallbackSections({
      title: "GitHub Copilot CLI combines model families for a second opinion",
      content:
        "这条新闻讨论开发者工具如何把不同模型串联起来做第二意见审查，并影响代码评审入口、默认工作流和工程效率。这里补足足够长度，确保 fallback 逻辑会尝试生成解读，而不是因为内容过薄直接跳过。第二段再补一层上下文，说明这种变化会影响团队默认调用路径和评审节奏。",
      category: "software",
      source: "The GitHub Blog",
      scoreReasoning: {
        signalStrength: "含有实质新增信息",
        decisionUsefulness: "会改变开发者工具入口和默认调用路径",
        futureImpact: "对工程效率和评审流程有持续影响",
      } as never,
      contentDepth: 320,
    });

    expect(fallback.event.length).toBeGreaterThan(0);
    expect(fallback.interpretation).toContain("开发者工具入口");
  });
});
