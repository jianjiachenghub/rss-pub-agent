# Frontend

当前前端是一个 Next.js 16 应用，是仓库当前默认展示层。

## Responsibility

- 读取 `../content/` 下的日报与索引
- 渲染首页、日报详情、周聚合页和播客入口
- 基于日报动态聚合时间线与周报视图
- 不负责跑新闻管线，也不直接生成内容

## Routes

当前主要页面入口：

- [app/page.tsx](app/page.tsx)
  - 中文首页，读取 `content/index.json`
- [app/[date]/page.tsx](app/[date]/page.tsx)
  - 中文日报详情，读取 `content/<date>/daily.md`
- [app/weekly/[week]/page.tsx](app/weekly/[week]/page.tsx)
  - 中文周聚合页，运行时由多天日报聚合生成
- [app/podcast/page.tsx](app/podcast/page.tsx)
  - 播客入口页
- [app/en/](app/en)
  - 英文镜像路由，优先读取 `*.en.md`，缺失时回退到中文产物
- [app/about/page.tsx](app/about/page.tsx) / [app/en/about/page.tsx](app/en/about/page.tsx)
  - 项目说明页，数据来自 `lib/project-guide.ts`

## Key Paths

- [app/](app)
  - 页面路由
- [components/](components)
  - 展示组件
- [lib/content-loader.ts](lib/content-loader.ts)
  - 内容读取与聚合逻辑
- [lib/daily-report-parser.ts](lib/daily-report-parser.ts)
  - 日报 Markdown 解析
- [lib/display-text.ts](lib/display-text.ts)
  - 标题、日期、周标签等展示文案
- [lib/project-guide.ts](lib/project-guide.ts)
  - About 页面使用的项目说明数据

## Rendering Flow

前端本身不依赖数据库，渲染链路非常直接：

1. 先从 `content/index.json` 读出可用日期列表
2. 详情页再按日期读取 `daily.md`、`meta.json`、`podcast-script.md`
3. 周视图通过 `lib/content-loader.ts` 在服务端聚合多天内容
4. 页面组件只消费已经整理好的 issue 数据，不参与日报生成逻辑

## Commands

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

或在仓库根目录：

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint
```

仓库根 `package.json` 目前不代理这些前端脚本。

## Data Contract

前端默认依赖以下文件存在：

- `content/index.json`
- `content/YYYY-MM-DD/daily.md`
- `content/YYYY-MM-DD/meta.json`
- `content/YYYY-MM-DD/podcast-script.md`（可选）

补充约束：

- 英文页面优先读取 `daily.en.md`、`podcast-script.en.md`，没有时降级读取中文文件
- 周报不是预生成文件，而是运行时按日期聚合
- `content/` 是唯一内容来源，`reports/` 目录不参与当前前端主路径

如果首页没有内容，优先检查数据管线是否已生成这些文件。

## Troubleshooting

- 首页空白：先确认 `content/index.json` 是否存在且 `dates` 非空
- 某天打不开：检查 `content/<date>/daily.md` 与 `meta.json`
- 英文页回退成中文：通常说明对应 `*.en.md` 尚未生成
- 周报聚合异常：优先看 `lib/content-loader.ts` 里的日期分组和 Markdown 提取逻辑
