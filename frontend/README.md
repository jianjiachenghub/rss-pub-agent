# Frontend

当前前端是一个 Next.js 16 应用，也是仓库根脚本默认指向的展示层。

## Responsibility

- 读取 `../content/` 下的日报与索引
- 渲染首页、日报详情和播客入口
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
npm run dev
npm run build
npm run lint
```

## Data Contract

前端默认依赖以下文件存在：

- `content/index.json`
- `content/YYYY-MM-DD/daily.md`
- `content/YYYY-MM-DD/meta.json`
- `content/YYYY-MM-DD/podcast-script.md`（可选）

如果首页没有内容，优先检查数据管线是否已生成这些文件。
