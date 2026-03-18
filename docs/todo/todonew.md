# 数据采集层 + 前端重构 — 已完成

> 此文件中的 TODO 已在 2026-03-18 全部完成，详见 `todo.md`。

## 已完成项

### 1. ✅ Folo API 调用方式优化
- 重构了 `folo.ts`，支持按 listId 拉取
- 添加了 AbortSignal 超时和更好的错误处理
- Follow 没有公开 API 文档，暂以 RSS 直接采集为主

### 2. ✅ RSS 源扩充
- 从 2 个 RSS 源扩展到 24 个高质量源
- 覆盖 AI 实验室、新闻、开源、学术、博客、社区、中文媒体
- 参考了 5+ 个开源新闻采集项目的源列表

### 3. ✅ Follow 的正确用法研究
- Follow API 无公开文档，依赖 session token (不稳定)
- 当前策略：纯 RSS 直接采集，Follow 作为低优先级备选

### 4. ✅ 前端导航重构
- Sidebar 从扁平日期列表改为年→月折叠树
- 支持多年数据导航
- content-loader 支持层级数据结构 (getGroupedByYear)
