# LLM News Flow - TODO 清单

> 更新日期：2026-03-18

---

## 已完成

### 1. ~~配置 API Keys 基础设施~~
- [x] 创建了 `.env.example` 模板文件
- [x] 添加了 `dotenv` 依赖，`graph.ts` 自动加载 `.env`
- [x] `.env` 已配置 GEMINI_API_KEY

### 2. ~~初始化 Git 仓库~~
- [x] `git init` + 首次提交，统一 frontend 子仓库
- [x] `.gitignore` 完善

### 3. ~~验证前端构建~~
- [x] 修复 `content/index.json` dates 为空的 bug
- [x] `npm run build` 通过

### 4. ~~试跑管线~~
- [x] 管线连接成功，fetch 节点正常抓取 1638 条
- [x] 修复了 Gemini SDK 延迟初始化问题
- ⚠️ Gemini 免费版配额耗尽 (429)，需升级付费版或配置 OPENAI_API_KEY

### 5. ~~补全 RSS 源列表~~
- [x] 从 3 个源扩展到 24 个高质量源
- [x] 覆盖：AI 实验室 (6) + 开源 (3) + AI 新闻 (6) + 中文 (1) + 学术 (2) + 博客 (4) + 社区 (2)
- [x] 参考了 foorilla/allainews_sources、RSS-Renaissance/awesome-AI-feeds 等开源项目
- [x] 研究报告保存在 `scripts/rss-feeds-research/`

### 6. ~~重构数据采集层~~
- [x] `folo.ts` — 支持 listId 参数、AbortSignal 超时、更好的错误处理
- [x] `rss.ts` — 添加 24h 时间过滤、Accept header
- [x] `fetch.ts` — 添加并发控制 (CONCURRENCY=5)、改进去重逻辑
- [x] `types.ts` — FeedSource 添加可选 listId 字段

### 7. ~~重构前端导航~~
- [x] `Sidebar.tsx` — 年→月折叠树导航，替代扁平日期列表
- [x] `content-loader.ts` — 支持 getGroupedByYear() 层级数据
- [x] 所有页面更新传递 years prop
- [x] `npm run build` 通过

---

## 待完成

### 8. Gemini 配额问题
当前 GEMINI_API_KEY 是免费版，配额已耗尽。解决方案：
- 方案A：在 Google AI Studio 升级为付费版
- 方案B：配置 `OPENAI_API_KEY` 作为 fallback
- 方案C：等待免费配额每日刷新

### 9. 推到 GitHub
```bash
git remote add origin https://github.com/你的用户名/llm-news-flow.git
git push -u origin master
```
然后在 Settings → Secrets 配置 Actions secrets。

### 10. 调优 Prompt
管线跑通后根据输出调整：
- `configs/prompt.json` — 兴趣偏好
- `scripts/lib/prompts.ts` — Prompt 模板

### 11. Follow API 集成 (低优先级)
Follow (Folo) 没有公开 API 文档，依赖 session token 认证不稳定。
当前策略：纯 RSS 直接采集。以后在 Follow 里管理好列表后再接入。
