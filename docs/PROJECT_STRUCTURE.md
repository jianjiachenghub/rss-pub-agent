# 项目结构

## 简化后的纯静态架构

```
rss-pub-agent/
├── web/                          # 前端 (Vite + TanStack)
│   ├── src/
│   │   ├── app/                  # TanStack Router 路由
│   │   │   ├── __root.tsx        # 根布局
│   │   │   ├── index.tsx         # 日报列表页
│   │   │   ├── $date.tsx         # 日报详情页
│   │   │   └── podcast/
│   │   │       ├── index.tsx     # 播客列表
│   │   │       └── $date.tsx     # 播客详情
│   │   ├── components/           # 组件
│   │   │   ├── ui/               # UI 组件 (Card)
│   │   │   ├── news-card.tsx     # 新闻卡片（重点用）
│   │   │   ├── news-list.tsx     # 新闻列表（其他用）
│   │   │   └── stream-content.tsx # 流式渲染组件
│   │   ├── lib/                  # 工具函数
│   │   │   ├── markdown.ts       # Markdown 解析 + 索引读取
│   │   │   └── utils.ts          # 工具函数
│   │   ├── types/                # 类型定义
│   │   ├── routeTree.gen.ts      # 路由树
│   │   ├── main.tsx              # 入口
│   │   └── index.css             # 全局样式
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── scripts/                      # 数据处理脚本
│   ├── nodes/                    # LangGraph 节点
│   │   ├── fetch.ts
│   │   ├── gate-keep.ts
│   │   ├── score.ts
│   │   ├── insight.ts
│   │   └── generate-daily.ts
│   ├── lib/
│   │   ├── folo.ts
│   │   ├── prompts.ts
│   │   └── llm.ts
│   ├── generate-index.ts         # 生成日报索引 JSON
│   ├── state.ts
│   └── graph.ts
│
├── reports/                      # 日报 Markdown 文件
│   ├── 2026-03-22.md
│   └── index.json                # 日报索引 (自动生成)
│
├── configs/
│   └── feeds.json                # 数据源配置
│
└── docs/                         # 文档
    ├── ARCHITECTURE_V2.md
    └── PROJECT_STRUCTURE.md
```

## 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **构建**: Vite 6
- **路由**: TanStack Router
- **数据**: TanStack Query (缓存 Markdown 内容)
- **样式**: Tailwind CSS v4
- **Markdown**: marked (解析)
- **图标**: Lucide React

### 数据处理
- **工作流**: LangGraph
- **数据源**: Follow API + RSSHub
- **LLM**: OpenAI/DeepSeek

## 数据流

```
GitHub Actions (每日定时)
    ↓
1. 抓取 Follow API + RSSHub 热榜
2. LLM 过滤/评分/分类
3. 生成 Markdown 日报 → reports/YYYY-MM-DD.md
4. 生成索引 → reports/index.json
5. 生成播客音频 → R2/音频文件
    ↓
推送到 GitHub
    ↓
Cloudflare Pages / Vercel (静态托管)
    ↓
前端直接读取 Markdown 文件
```

## Markdown 格式

```markdown
# AI 日报 | 2026年3月22日

> 今日核心趋势：AI 编程工具进入"画布时代"

---

## 🔥 重点

**标题** — 描述 [来源](URL) | 92分

---

## 📦 产品更新

- [标题](URL) — 描述 | 来源
- [标题](URL) — 描述 | 来源

---

## 🔬 前沿研究
...
```

## 运行方式

### 前端开发
```bash
cd web
npm run dev
```

### 构建
```bash
cd web
npm run build
```

### 部署到 Cloudflare Pages
```bash
cd web
npm run build
# 部署 dist/ 目录到 Cloudflare Pages
```

## 特性

- ✅ **纯静态** - 无需后端服务器
- ✅ **流式渲染** - 渐进式显示内容
- ✅ **标准 Markdown** - 兼容飞书等第三方导入
- ✅ **自动生成索引** - GitHub Actions 每日更新
- ✅ **类型安全** - TypeScript 全程支持
