1. frontend 优化新闻详情页的头部信息，压缩一下 像这个今日概览这个模块就可以直接删除掉
“今日概览
焦点条目
01
人机协作攻克 Knuth "Claude Cycles" 计算难题
02
OpenAI Sora 产品将下线，飞书开源 AI Agent 工具链
03
斯坦福发布 AI 代理沙箱工具，CERN 部署纳秒级边缘 AI”
2. 把右侧的目录栏做得好看一点 目前如果标题展示成了两行的话，看着很乱
3. 正文的分类与分类之间的间隔太大了，你缩小一半呢？正文的标题应该要占满一行，别搞这种换行的展示。

4. 然后把那个评分和来源的标签，你放到那个解读的下面吧 对齐一下事件解读的这个格式  比如说，你再加一行信息源，或者是再加一行来源之类的 有些标题的上面怎么还有一行字啊？这个可以优化掉

5.  然后这个抓取的逻辑是不是不太对呀？按理说我一天大概能拉回来 1,000 多条新闻的，他这个是不是没有把昨天 24 小时的新闻给全部拉回来啊？比如说我在 30 号执行这个命令的话，那理论上来说，应该是把 29 号（也就是 0 到 24 点）的这些新闻全给拉回来 你按照这个逻辑帮我修一下呢; 然后你可以去看一下这个抓取逻辑和生成的对应文档content\2026-03-30\daily.md 比如这一天，你看才抓回来不到 10 条新闻，才五六条新闻。

按理说，我们 1000 多条新闻加工过滤过后，至少得产出 20 条左右的有用信息吧，不然就太少了。或者至少得十几条吧，正常水位应该在 20 条左右
```
PS E:\repo\claude-code\rss-pub-agent\scripts> tsx graph.ts
API key should be set when using the Gemini API.
API key should be set when using the Gemini API.
[dotenv@17.3.1] injecting env (4) from ..\.env -- tip: ⚙️  suppress all logs with { quiet: true }
=== LLM News Flow Pipeline ===
Started at: 2026-03-30T14:06:08.627Z
[folo-list] Fetching list: Follow AI 列表 (listId: 260024685080717312)
[folo-list] Using session token: hO67beqq55S28YYp2XgR...
[folo-list] Target: fetch recent news within 24h, up to 30 pages, 100 items/page and 2500 items total
[folo-list] Fetching page 1/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 1: 100 items, 100 within 24h, 0 too old, 0 empty entries, 0 missing timestamps
[folo-list] Fetching page 2/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100,"publishedAfter":"2026-03-30T10:01:27.756Z"}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 2: 100 items, 100 within 24h, 0 too old, 0 empty entries, 0 missing timestamps
[folo-list] Fetching page 3/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100,"publishedAfter":"2026-03-30T06:14:33.769Z"}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 3: 100 items, 100 within 24h, 0 too old, 0 empty entries, 0 missing timestamps
[folo-list] Fetching page 4/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100,"publishedAfter":"2026-03-30T02:31:08.100Z"}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 4: 100 items, 100 within 24h, 0 too old, 0 empty entries, 0 missing timestamps
[folo-list] Fetching page 5/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100,"publishedAfter":"2026-03-29T21:57:23.269Z"}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 5: 100 items, 90 within 24h, 10 too old, 0 empty entries, 0 missing timestamps
[folo-list] Fetching page 6/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100,"publishedAfter":"2026-03-29T13:31:41.251Z"}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 6: 100 items, 0 within 24h, 100 too old, 0 empty entries, 0 missing timestamps
[folo-list] Fetching page 7/30...
[folo-list] POST body: {"listId":"260024685080717312","view":0,"withContent":false,"limit":100,"publishedAfter":"2026-03-29T05:07:49.306Z"}
[folo-list] HTTP status: 200 OK
[folo-list] Response code: 0, data length: 100
[folo-list] Page 7: 100 items, 0 within 24h, 100 too old, 0 empty entries, 0 missing timestamps
[folo-list] Saw 2 consecutive pages without 24h entries, stopping.
[folo-list] Total entries within 24h: 490
[folo-list] Returning 490 entries (from 490 total)
[folo-list] Entry 1:
```

6. 然后你再整体优化一下我之前那个 LLM 的调用决策大脑。以输出一篇高价值的新闻日报为核心目标; 就是优化一下这个项目的 prompt 和对应输出的新闻正文的内容;尽量让输出的新闻 MD 文件和最终要渲染到 FrontEnd 的结构一致吧，就是不做过多的硬编码处理;