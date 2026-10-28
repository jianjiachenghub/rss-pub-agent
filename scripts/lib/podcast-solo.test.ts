import { describe, expect, it } from "vitest";
import { renderSoloPodcastScript, toSpokenText } from "./podcast-solo.js";

const daily = `---
title: "个人日报 | 2026年10月27日"
date: "2026-10-27"
itemCount: 1
---

# 个人日报 | 2026年10月27日

## 今日判断

> 企业要同时衡量效率与现金流，不能把非现金亏损直接当成现金消耗。

---

## AI

### 模型降价50%，专业任务提升15个百分点

![模型配图](https://example.test/image.png)

**事件：** API价格降低50%，任务成本约为原来的三分之一。

**解读：** 收益仍取决于成功率，不能忽略人工接管次数。

评分 93 · 来源 [OpenAI News](https://example.test/source)

## 接下来要盯的变量

观察实际部署、采购订单和再融资成本。

## 更多 24h 资讯

> 以下条目进入了候选池，但没有进入今天的主深度解读区。

#### 科技
- [12:53] [补充新闻不能丢](https://example.test/secondary) | *Readhub - 每日早报*
`;

describe("complete-report solo podcast", () => {
  it("keeps framing, every article, events, interpretations, scores, sources and secondary news", () => {
    const script = renderSoloPodcastScript(daily, { date: "2026-10-27" });

    for (const text of [
      "单播版", "2026年10月27日", "今日判断", "AI", "接下来要盯的变量", "更多 24h 资讯",
      "企业要同时衡量效率与现金流，不能把非现金亏损直接当成现金消耗。",
      "模型降价50%，专业任务提升15个百分点",
      "API价格降低50%，任务成本约为原来的三分之一。",
      "收益仍取决于成功率，不能忽略人工接管次数。",
      "评分是 93 分", "来源是OpenAI News", "观察实际部署、采购订单和再融资成本。",
      "补充新闻不能丢", "12 点 53 分", "Readhub - 每日早报",
    ]) {
      expect(script).toContain(text);
    }
    expect(script).not.toMatch(/主持人\s*[AB]|Speaker\s*[AB]|5\s*分钟|预计时长/);
    expect(script).not.toContain("https://");
    expect(script).not.toContain("![");
    expect(script).not.toContain("itemCount:");
    expect(script).not.toContain("**");
  });

  it("does not truncate a full 12-item report or its 19 secondary headlines", () => {
    const main = Array.from({ length: 12 }, (_, i) =>
      `### 深度条目${i}\n\n**事件：** 完整事件${i}。\n\n**解读：** 完整解读${i}。\n\n评分 ${80 + i} · 来源 [信源${i}](https://example.test/${i})`
    ).join("\n\n");
    const secondary = Array.from({ length: 19 }, (_, i) =>
      `- [08:00] [补充条目${i}](https://example.test/extra/${i}) | *补充信源${i}*`
    ).join("\n");
    const script = renderSoloPodcastScript(
      `# 完整日报\n\n## AI\n\n${main}\n\n## 更多 24h 资讯\n\n#### 科技\n${secondary}`,
      { date: "2026-10-27" }
    );

    for (let i = 0; i < 12; i++) {
      expect(script).toContain(`深度条目${i}`);
      expect(script).toContain(`完整事件${i}。`);
      expect(script).toContain(`完整解读${i}。`);
      expect(script).toContain(`评分是 ${80 + i} 分。来源是信源${i}`);
    }
    for (let i = 0; i < 19; i++) {
      expect(script).toContain(`补充条目${i}`);
      expect(script).toContain(`补充信源${i}`);
    }
    expect(script.match(/^第 \d+ 条/gm)).toHaveLength(12);
    expect(script.match(/^补充资讯第 \d+ 条/gm)).toHaveLength(19);
  });

  it("accepts CRLF/frontmatter and preserves unrecognized prose and precise numbers", () => {
    const script = renderSoloPodcastScript(
      daily.replace(/\n/g, "\r\n") + "\r\n额外说明：2028年到期3000亿美元，利率2%至3%，需区分报价与成交。",
      { date: "2026-10-27", reportName: "我的新闻" }
    );
    expect(script).toContain("欢迎收听我的新闻");
    expect(script).toContain("额外说明：2028年到期3000亿美元，利率2%至3%，需区分报价与成交。");
    expect(script).not.toContain("title:");
  });

  it("rejects missing report content and invalid dates", () => {
    for (const text of ["", "   ", "# 只有标题\n\n## AI"]) {
      expect(() => renderSoloPodcastScript(text, { date: "2026-10-27" })).toThrow("without daily report content");
    }
    for (const date of ["../../secret", "2026-02-30", "2026-13-01"]) {
      expect(() => renderSoloPodcastScript(daily, { date })).toThrow("valid YYYY-MM-DD");
    }
  });

  it("removes formatting without changing product names or numeric prose", () => {
    expect(toSpokenText("**事件：** `GLM_5.3_Workers`价格降50%，来源 [示例](https://example.test)。"))
      .toBe("事件： GLM_5.3_Workers价格降50%，来源 示例。");
  });
});
