# Frontend

当前前端是一个 Next.js 16 应用，是仓库当前默认展示层。

## Responsibility

- 读取 `../content/` 下的日报与索引
- 渲染首页、日报详情和播客入口
- 基于日报动态聚合周报与时间线视图
- 不负责跑新闻管线，也不直接生成内容

## Key Paths

- [app/](app) 页面路由
- [components/](components) 展示组件
- [lib/content-loader.ts](lib/content-loader.ts) 内容读取与聚合逻辑

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

如果首页没有内容，优先检查数据管线是否已生成这些文件。
