import { describe, expect, it } from "vitest";
import {
  buildLarkDailyCategoryTextMessagesFromMarkdown,
  buildLarkDailyCategoryMarkdownMessagesFromMarkdown,
  buildLarkDailyNewsPostFromMarkdown,
} from "./lark-rich-post.js";

describe("buildLarkDailyNewsPostFromMarkdown", () => {
  it("renders only the categorized main daily news items as a Feishu post payload", () => {
    const post = buildLarkDailyNewsPostFromMarkdown(`---
title: "个人日报 | 2026年6月26日"
date: "2026-06-26"
itemCount: 2
---

# 个人日报 | 2026年6月26日

## 今日判断

> 这里是开头判断，不能进入飞书群消息。

---

## AI

### [AI 基建周期继续扩张](https://example.com/ai)

![AI 基建周期继续扩张](https://example.com/image.png)

**事件：** 英伟达称 AI 基建周期将持续数十年。

**解读：** 算力投资仍是主线。

评分 90 · 来源 [Readhub](https://example.com/source)

---

## 商业

### 苹果上调 Mac 与 iPad 售价

**事件：** 内存成本推高终端价格。

评分 82 · 来源 [Bloomberg](https://example.com/business)

---

## 接下来要盯的变量

这里是结尾变量，不能进入飞书群消息。

---

## 更多 24h 资讯

#### AI
- [23:07] [额外新闻](https://example.com/extra) | *Example*
`);

    expect(post.zh_cn.title).toBe("个人日报 | 2026-06-26");

    const payloadText = JSON.stringify(post);
    expect(payloadText).toContain("AI");
    expect(payloadText).toContain("商业");
    expect(payloadText).toContain("AI 基建周期继续扩张");
    expect(payloadText).toContain("https://example.com/ai");
    expect(payloadText).toContain("事件：英伟达称 AI 基建周期将持续数十年。");
    expect(payloadText).toContain("解读：算力投资仍是主线。");
    expect(payloadText).toContain("评分 90 · 来源：Readhub");
    expect(payloadText).toContain("苹果上调 Mac 与 iPad 售价");
    expect(payloadText).toContain("https://example.com/business");
    expect(payloadText).not.toContain("今日判断");
    expect(payloadText).not.toContain("接下来要盯的变量");
    expect(payloadText).not.toContain("更多 24h 资讯");
    expect(payloadText).not.toContain("额外新闻");
    expect(payloadText).not.toContain("image.png");
  });

  it("can limit the number of rendered items for chat delivery", () => {
    const post = buildLarkDailyNewsPostFromMarkdown(
      `---
title: "个人日报 | 2026年6月26日"
date: "2026-06-26"
---

# 个人日报 | 2026年6月26日

## AI

### 第一条

**事件：** A

评分 90 · 来源 [Source](https://example.com/1)

### 第二条

**事件：** B

评分 80 · 来源 [Source](https://example.com/2)

## 商业

### 第三条

**事件：** C

评分 70 · 来源 [Source](https://example.com/3)
`,
      { maxItems: 2 }
    );

    const payloadText = JSON.stringify(post);
    expect(payloadText).toContain("第一条");
    expect(payloadText).toContain("第二条");
    expect(payloadText).not.toContain("第三条");
    expect(payloadText).toContain("已截取前 2 条");
  });
});

describe("buildLarkDailyCategoryTextMessagesFromMarkdown", () => {
  it("splits categorized items into compact text messages without dropping items", () => {
    const messages = buildLarkDailyCategoryTextMessagesFromMarkdown(
      `---
title: "个人日报 | 2026年6月26日"
date: "2026-06-26"
---

# 个人日报 | 2026年6月26日

## AI

### 第一条 AI 新闻

**事件：** 第一条 AI 事件说明。

评分 90 · 来源 [Source](https://example.com/1)

### 第二条 AI 新闻

**事件：** 第二条 AI 事件说明。

评分 88 · 来源 [Source](https://example.com/2)

## 商业

### 商业新闻

**事件：** 商业事件说明。

评分 86 · 来源 [Biz](https://example.com/3)
`,
      { maxChars: 80 }
    );

    expect(messages.length).toBeGreaterThan(2);
    expect(messages.map((message) => message.category)).toContain("AI");
    expect(messages.map((message) => message.category)).toContain("商业");

    const combined = messages.map((message) => message.text).join("\n");
    expect(combined).toContain("个人日报 | 2026-06-26 | AI");
    expect(combined).toContain("第一条 AI 新闻");
    expect(combined).toContain("第二条 AI 新闻");
    expect(combined).toContain("商业新闻");
    expect(combined).toContain("本分类共 2 条");
  });
});

describe("buildLarkDailyCategoryMarkdownMessagesFromMarkdown", () => {
  it("renders category headings, bold item titles, and repository links for Feishu markdown", () => {
    const messages = buildLarkDailyCategoryMarkdownMessagesFromMarkdown(
      `---
title: "个人日报 | 2026年6月26日"
date: "2026-06-26"
---

# 个人日报 | 2026年6月26日

## 软件工程

### [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot)

**事件：** Vercel 开源了新的 AI chatbot 模板。

**解读：** 这会影响 AI 应用默认脚手架和部署路径。

评分 91 · 来源 [GitHub Trending](https://github.com/vercel/ai-chatbot)
`,
      { fallbackDate: "2026-06-26" }
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].markdown).toContain("**个人日报 | 2026-06-26 | 软件工程**");
    expect(messages[0].markdown).toContain("本分类共 **1** 条");
    expect(messages[0].markdown).toContain(
      "**1. [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot)**"
    );
    expect(messages[0].markdown).toContain("**事件：** Vercel 开源了新的 AI chatbot 模板。");
    expect(messages[0].markdown).toContain(
      "**仓库：** [GitHub Trending](https://github.com/vercel/ai-chatbot)"
    );
  });

  it("uses compact spacing at the top of each Feishu markdown message", () => {
    const messages = buildLarkDailyCategoryMarkdownMessagesFromMarkdown(
      `---
title: "个人日报 | 2026年6月26日"
date: "2026-06-26"
---

# 个人日报 | 2026年6月26日

## 政策地缘

### 政策新闻

**事件：** 事件说明。

评分 91 · 来源 [Source](https://example.com/source)
`,
      { fallbackDate: "2026-06-26" }
    );

    expect(messages[0].markdown).toMatch(
      /^\*\*个人日报 \| 2026-06-26 \| 政策地缘\*\*\n\n本分类共 \*\*1\*\* 条\n\n\*\*1\. \[政策新闻\]\(https:\/\/example\.com\/source\)\*\*/
    );
    expect(messages[0].markdown).not.toMatch(/\n{3,}/);
    expect(messages[0].markdown).not.toContain("## 政策地缘");
  });

  it("keeps a normal full category in one message by default", () => {
    const itemBlocks = Array.from({ length: 7 }, (_, index) => {
      const itemNumber = index + 1;
      return `### 第 ${itemNumber} 条政策新闻

**事件：** 这是第 ${itemNumber} 条政策新闻的事件说明，包含足够长的上下文，用来模拟真实日报里的单条内容。

**解读：** 这是第 ${itemNumber} 条政策新闻的解读说明，长度接近真实输出，但仍应留在同一个分类消息里。

评分 80 · 来源 [Source ${itemNumber}](https://example.com/${itemNumber})`;
    }).join("\n\n");

    const messages = buildLarkDailyCategoryMarkdownMessagesFromMarkdown(
      `---
title: "个人日报 | 2026年6月26日"
date: "2026-06-26"
---

# 个人日报 | 2026年6月26日

## 政策地缘

${itemBlocks}
`,
      { fallbackDate: "2026-06-26" }
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].title).toBe("个人日报 | 2026-06-26 | 政策地缘");
    expect(messages[0].markdown).not.toContain("（1/2）");
    expect(messages[0].markdown).toContain(
      "**7. [第 7 条政策新闻](https://example.com/7)**"
    );
  });
});
