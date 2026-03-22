# 技术重构方案

## 1. 前端重构：Next.js → Vite + TanStack

### 1.1 当前架构问题

| 问题 | 现状 | 目标 |
|------|------|------|
| 构建工具 | Next.js + Webpack | Vite（更快的热更新和构建） |
| 路由 | Next.js File-based | TanStack Router（类型安全、更灵活） |
| 数据获取 | 服务端组件 + fetch | TanStack Query（缓存、乐观更新） |
| 状态管理 | 无明确方案 | TanStack Query + Zustand |
| UI 组件 | 自定义 | shadcn/ui（参考 agentara） |

### 1.2 目标架构

```
web/
├── src/
│   ├── app/                    # TanStack Router 路由
│   │   ├── __root.tsx          # 根布局
│   │   ├── index.tsx           # 首页（日报列表）
│   │   ├── $date.tsx           # 日报详情页（动态路由）
│   │   └── podcast/            # 播客页面
│   │       └── index.tsx
│   ├── components/             # 组件
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── daily-report.tsx    # 日报卡片组件
│   │   ├── news-card.tsx       # 新闻卡片（重点用）
│   │   ├── news-list.tsx       # 新闻列表（其他用）
│   │   └── podcast-player.tsx  # 播客播放器
│   ├── hooks/                  # 自定义 hooks
│   │   ├── use-daily-reports.ts
│   │   └── use-podcast.ts
│   ├── lib/                    # 工具函数
│   │   ├── api.ts              # API 客户端
│   │   └── utils.ts
│   ├── styles/
│   │   └── global.css
│   └── main.tsx                # 入口
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 1.3 技术栈

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-router": "^1.166.0",
    "@tanstack/react-query": "^5.90.0",
    "@tanstack/react-query-devtools": "^5.90.0",
    "zustand": "^5.0.0",
    "dayjs": "^1.11.0",
    "lucide-react": "^0.460.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@tanstack/router-devtools": "^1.166.0",
    "@tanstack/router-plugin": "^1.166.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.6.0"
  }
}
```

### 1.4 日报组件设计

#### 混合形式：卡片 + 列表

```tsx
// 日报页面结构
function DailyReportPage({ date }: { date: string }) {
  const { data: report } = useDailyReport(date);
  
  // 按分数排序，前 3 条作为重点
  const featured = report.items.slice(0, 3);
  const others = report.items.slice(3);
  
  // 按分类分组其他内容
  const byCategory = groupBy(others, 'category');
  
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* 标题和日期 */}
      <header className="mb-8">
        <h1>AI 日报</h1>
        <p>{formatDate(date)}</p>
        <blockquote>{report.summary}</blockquote>
      </header>
      
      {/* 重点内容 - 卡片形式 */}
      <section className="mb-8">
        <h2>🔥 重点</h2>
        <div className="grid gap-4">
          {featured.map(item => (
            <NewsCard key={item.id} item={item} featured />
          ))}
        </div>
      </section>
      
      {/* 分类内容 - 列表形式 */}
      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="mb-6">
          <h3>{getCategoryIcon(category)} {category}</h3>
          <NewsList items={items} />
        </section>
      ))}
    </div>
  );
}

// 新闻卡片（重点用）
function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <Card className={featured ? "border-l-4 border-l-orange-500" : ""}>
      <CardHeader>
        <CardTitle>{item.oneLiner}</CardTitle>
        <CardDescription>
          {item.whyItMatters}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <a href={item.url} target="_blank" rel="noopener">
          {item.source} ↗
        </a>
        <span className="ml-auto">{item.weightedScore}分</span>
      </CardFooter>
    </Card>
  );
}

// 新闻列表（其他用）
function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item.id} className="flex items-start gap-2">
          <span className="text-muted-foreground">•</span>
          <div className="flex-1">
            <a href={item.url} className="font-medium hover:underline">
              {item.title}
            </a>
            <p className="text-sm text-muted-foreground">
              {item.oneLiner}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {item.source}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

---

## 2. 后端技术选型

### 2.1 方案对比

| 方案 | 技术栈 | 优点 | 缺点 | 适用场景 |
|------|--------|------|------|----------|
| **A. 纯静态** | GitHub Actions + R2/Vercel | 简单、免费、无服务器 | 无实时能力 | 当前方案，日报延迟可接受 |
| **B. Serverless** | Cloudflare Workers + D1 | 边缘部署、低延迟、免费额度高 | 有冷启动 | 需要实时 API，但计算不重 |
| **C. 轻量服务器** | Hono + Bun + SQLite | 开发体验好、类型安全 | 需要维护服务器 | 需要后台管理、用户系统 |
| **D. 完整后端** | Hono + Bun + PostgreSQL | 功能完整、可扩展 | 复杂度高 | 多用户、复杂业务 |

### 2.2 推荐方案：B（Cloudflare Workers）

参考 agentara 的架构，采用 **Cloudflare Workers + D1**:

```
backend/
├── src/
│   ├── index.ts              # Hono 入口
│   ├── routes/
│   │   ├── reports.ts        # 日报 API
│   │   ├── podcast.ts        # 播客 API
│   │   └── health.ts         # 健康检查
│   ├── services/
│   │   ├── report-service.ts
│   │   └── podcast-service.ts
│   └── db/
│       ├── schema.ts         # Drizzle schema
│       └── index.ts
├── wrangler.toml
├── drizzle.config.ts
└── package.json
```

### 2.3 API 设计

```typescript
// GET /api/reports
interface ListReportsResponse {
  reports: {
    date: string;
    title: string;
    summary: string;
    itemCount: number;
  }[];
}

// GET /api/reports/:date
interface GetReportResponse {
  date: string;
  title: string;
  summary: string;
  featured: NewsItem[];      // 重点（前3条）
  categories: {              // 分类内容
    name: string;
    items: NewsItem[];
  }[];
}

// GET /api/podcast/:date
interface GetPodcastResponse {
  date: string;
  audioUrl: string;
  duration: number;
}
```

### 2.4 数据库 Schema（D1 + Drizzle）

```typescript
// schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey(),
  date: text("date").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(), // Markdown
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const newsItems = sqliteTable("news_items", {
  id: integer("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id),
  title: text("title").notNull(),
  oneLiner: text("one_liner").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  url: text("url").notNull(),
  source: text("source").notNull(),
  category: text("category").notNull(),
  weightedScore: real("weighted_score").notNull(),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
});

export const podcasts = sqliteTable("podcasts", {
  id: integer("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id),
  script: text("script").notNull(),
  audioUrl: text("audio_url"),
  duration: integer("duration"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

---

## 3. 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户访问                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                             │
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│   │  静态资源   │   │   Pages     │   │  Workers    │       │
│   │  (R2)      │   │  (前端)     │   │  (API)      │       │
│   └─────────────┘   └─────────────┘   └──────┬──────┘       │
│                                              │              │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare D1                              │
│                    (SQLite 数据库)                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                             │
│                                                              │
│   每日定时执行：fetch → gate-keep → score → insight → generate │
│                         ↓                                    │
│                   写入 D1 + 上传 R2                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 实施步骤

### Phase 1: 前端重构（1-2 天）

1. 创建新的 `web/` 目录
2. 初始化 Vite + React + TypeScript
3. 配置 TanStack Router + TanStack Query
4. 配置 Tailwind CSS + shadcn/ui
5. 实现日报列表页和详情页
6. 配置 Cloudflare Pages 部署

### Phase 2: 后端搭建（1-2 天）

1. 创建 `backend/` 目录
2. 初始化 Hono + Cloudflare Workers
3. 配置 Drizzle ORM + D1
4. 实现 API 路由
5. 配置 Wrangler 部署

### Phase 3: 数据迁移（1 天）

1. 将现有 Markdown 内容导入 D1
2. 配置 GitHub Actions 写入 D1
3. 测试完整流程

### Phase 4: 优化（可选）

1. 添加搜索功能
2. 添加 RSS 输出
3. 添加邮件订阅

---

## 5. 参考 agentara 的最佳实践

从 agentara 学到的：

1. **使用 Bun** - 更快的包管理和运行
2. **Hono 框架** - 轻量、类型安全、支持多种运行时
3. **Drizzle ORM** - 类型安全的数据库操作
4. **TanStack Router** - 类型安全的路由
5. **文件结构** - 清晰的 `src/app/`, `src/components/`, `src/lib/` 分层
6. **Skill 系统** - 可扩展的模块化设计（可用于后续扩展）
