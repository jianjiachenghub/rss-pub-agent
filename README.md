# LLM News Flow

LLM 驱动的个人新闻聚合与多平台分发系统。

项目每天从订阅源抓取新闻，经过多阶段筛选、评分、补全与解读，最终生成：

- `content/YYYY-MM-DD/daily.md` 每日日报
- `content/YYYY-MM-DD/podcast-script.md` 播客脚本
- `content/YYYY-MM-DD/{brief,douyin,xhs}.md` 平台分发文案
- `content/index.json` 前端索引

## 当前架构

当前主链路由 [scripts/graph.ts](scripts/graph.ts) 编排：

`loadConfig -> fetchPrimary -> preFilter -> fetchCoverage -> buildEditorialAgenda -> gateKeep -> score -> enrichSelected -> insight -> generateDaily -> (podcastGen + platformsGen) -> publish -> notify`

关键约束：

- `scripts/` 是实际运行的数据管线
- `frontend/` 是当前对外展示的 Next.js 站点
- `content/` 是主产物目录，自动生成，不手动编辑
- `reports/` 和 `web/` 保留为历史兼容/实验资产，不是当前主路径

更完整的系统说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 快速开始

1. 安装依赖

```bash
cd scripts && npm install
cd ../frontend && npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

至少配置一个 LLM 提供商；推荐同时配置 `ZHIPU_API_KEY` 和 `GEMINI_API_KEY`。

3. 运行流水线

```bash
cd scripts
npx tsx graph.ts
```

也可以在仓库根目录执行：

```bash
npm run graph
```

4. 启动前端

```bash
npm run dev
```

默认打开 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
# root
npm run dev
npm run build
npm run graph

# scripts
cd scripts
npx tsx graph.ts
npx tsc --noEmit -p tsconfig.json
node ./node_modules/vitest/vitest.mjs run

# frontend
cd frontend
npm run dev
npm run build
npm run lint
```

## 仓库结构

```text
rss-pub-agent/
├── configs/        配置与选题偏好
├── content/        每日生成内容
├── docs/           当前文档、历史设计与归档
├── frontend/       当前 Next.js 前端
├── reports/        历史兼容输出
├── scripts/        LLM 管线与节点实现
└── web/            历史 Vite 原型
```

## 文档入口

- [docs/README.md](docs/README.md) 文档导航
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 当前系统架构
- [frontend/README.md](frontend/README.md) 当前前端说明
- [docs/todo.md](docs/todo.md) 待办与后续优化
- [docs/archive/README.md](docs/archive/README.md) 历史方案与归档说明
