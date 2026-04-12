<callout emoji="🛠️" background-color="light-green" border-color="green">
这份文档面向使用者和维护者，说明如何本地运行 <code>rss-pub-agent</code>、如何理解输出、以及出现问题时该从哪里排查。
</callout>

## 1. 适用对象

这份文档适合三类人：

- 想本地跑通 pipeline 的开发者
- 想调整信源、编辑策略或平台配置的维护者
- 想理解 GitHub Actions 每天到底做了什么的人

## 2. 本地依赖

项目当前拆成两个主要运行单元：

- `scripts/`：内容生产
- `frontend/`：内容展示

因此本地依赖也分两部分安装。

### 2.1 安装步骤

```bash
git clone https://github.com/jianjiachenghub/rss-pub-agent.git
cd rss-pub-agent

cd scripts && npm install && cd ..
cd frontend && npm install && cd ..
```

## 3. 环境变量

先复制模板：

```bash
cp .env.example .env
```

### 3.1 必填项

至少配置一个 LLM provider 的 API Key。

推荐优先级：

```bash
LLM_PROVIDERS=zhipu,gemini,openai
ZHIPU_API_KEY=your_key_here
```

### 3.2 常用可选项

| 变量 | 用途 | 是否常见必需 |
|---|---|---|
| `FOLO_SESSION_TOKEN` | 主力 Folo 列表抓取 | 是，若依赖 Folo 主输入 |
| `GEMINI_API_KEY` | Gemini LLM 与 TTS | 常用 |
| `OPENAI_API_KEY` | OpenAI provider 兜底 | 可选 |
| `DEEPSEEK_API_KEY` | DeepSeek 兜底 | 可选 |
| `SILICONFLOW_API_KEY` | SiliconFlow 兜底 | 可选 |
| `FEISHU_WEBHOOK_URL` | 飞书通知 | 可选 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram 通知 | 可选 |
| `WECHAT_WEBHOOK_URL` | 企业微信/微信 webhook 通知 | 可选 |
| `R2_ACCESS_KEY` / `R2_SECRET_KEY` / `R2_ACCOUNT_ID` / `R2_BUCKET` / `R2_PUBLIC_DOMAIN` | 播客音频上传到 Cloudflare R2 | 可选，但要生成音频时需要 |
| `REPORT_BASE_URL` | 外部通知里拼接日报链接 | 可选 |

## 4. 如何运行 Pipeline

### 4.1 仓库根目录运行

```bash
npm run graph
```

或：

```bash
npm run pipeline
```

两者都会进入 `scripts/` 执行主流水线。

### 4.2 直接在 scripts 目录运行

```bash
cd scripts
npx tsx graph.ts
```

### 4.3 指定日期运行

默认情况下，pipeline 会抓取“昨天”的资讯。  
如果要重跑某一天，可以显式指定：

```bash
cd scripts
npx tsx graph.ts --date 2026-04-08
```

### 4.4 从 raw 快照恢复

如果上一次跑到中途失败，而 `content/<date>/raw/` 已经存在中间快照，可以直接恢复：

```bash
cd scripts
npx tsx graph.ts --resume-from-raw 2026-04-08
```

也可以通过环境变量：

```bash
PIPELINE_RESUME_FROM_RAW=true
PIPELINE_DATE=2026-04-08
```

这个能力非常关键，因为它能避免重新抓取和重新调用整条 LLM 链路。

## 5. 输出结果怎么看

主输出目录是 `content/`。

### 5.1 每日目录结构

```text
content/YYYY-MM-DD/
├── daily.md
├── meta.json
├── brief.md
├── douyin.md
├── xhs.md
├── podcast-script.md
└── raw/
```

### 5.2 各文件职责

| 文件 | 作用 |
|---|---|
| `daily.md` | 正式日报正文 |
| `meta.json` | 条目数、分类、平均分、是否有播客、错误数 |
| `brief.md` | 短摘要，适合通知和快速分发 |
| `douyin.md` | 抖音文案 |
| `xhs.md` | 小红书文案 |
| `podcast-script.md` | 播客脚本 |
| `raw/*` | 中间快照，供恢复和调试使用 |

`content/index.json` 则维护所有日期索引，前端首页直接依赖它。

## 6. 如何启动前端

前端命令不在仓库根 `package.json` 里代理，需要显式进入 `frontend/`：

```bash
cd frontend
npm run dev
```

然后打开：

```text
http://localhost:3000
```

### 6.1 前端会读取什么

前端默认读取这些文件：

- `content/index.json`
- `content/YYYY-MM-DD/daily.md`
- `content/YYYY-MM-DD/meta.json`
- `content/YYYY-MM-DD/podcast-script.md`（可选）

如果首页空白，优先检查的不是前端代码，而是上游 pipeline 有没有把这些文件生成出来。

## 7. 配置修改应该改哪里

### 7.1 改信源

编辑：

```text
configs/feeds.json
```

可以修改：

- 分类
- 权重
- tier
- dailyCap
- keepInMainPool

### 7.2 改编辑策略

编辑：

```text
configs/prompt.json
```

这里定义：

- 兴趣主题
- `topN`
- 分类基础权重
- 最低覆盖保障
- 六维评分权重
- must-watch themes
- selection principles

### 7.3 改平台通知与分发配置

编辑：

```text
configs/platforms.json
```

这里定义：

- 飞书 webhook
- Telegram bot
- 微信 webhook
- XHS / Douyin 样式配置
- Podcast voices 和时长

## 8. GitHub Actions 每天会做什么

工作流文件：

```text
.github/workflows/daily-pipeline.yml
```

当前默认行为：

1. 以 Asia/Shanghai 时区计算前一天日期
2. 安装 `scripts/` 依赖
3. 运行 `scripts/graph.ts`
4. 执行 `scripts/generate-index.ts`
5. `git add reports/ content/`
6. 如果有变更，提交 `daily: YYYY-MM-DD`

注意一点：

<callout emoji="⚠️" background-color="light-yellow" border-color="yellow">
`publish` 节点本身不做 git commit。真正的提交发生在 GitHub Actions 里。
</callout>

## 9. 常见排查路径

### 9.1 跑完没有日报

先看：

- `content/<date>/daily.md` 是否存在
- `content/<date>/raw/` 是否存在快照
- 控制台最后输出的 `Errors` 数量

### 9.2 首页没有内容

优先检查：

- `content/index.json` 是否包含当天日期
- `content/<date>/daily.md` / `meta.json` 是否存在
- 运行前端时 `process.cwd()` 是否正确落在 `frontend/`

### 9.3 没有播客音频

先区分两件事：

- `podcast-script.md` 是否生成
- `meta.json` 中 `hasPodcast` 是否为 `true`

如果只有脚本没有音频，通常是：

- `GEMINI_API_KEY` 未配置或不可用
- TTS 调用失败
- R2 上传配置不完整

### 9.4 飞书重复发送或发送失败

看：

```text
.runtime/delivery/YYYY-MM-DD.json
```

这里会记录：

- `status`
- `attempts`
- `summaryPreview`
- `url`
- `lastError`

## 10. 推荐的日常操作方式

如果你是维护者，最省事的日常方式是：

1. 本地只改 `configs/` 或脚本逻辑
2. 用 `--date` 重跑一个已知日期做验证
3. 如中途失败，用 `--resume-from-raw` 恢复
4. 进 `frontend/` 本地预览
5. 确认内容结构无误后再推到远端

## 11. 一句话速记

如果要快速记住这个项目怎么用，可以记成：

> `scripts/` 负责生产，`frontend/` 负责展示，`content/` 是两者之间的稳定契约，`.runtime/` 保存投递状态。
