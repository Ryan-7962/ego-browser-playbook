# AGENTS.md

面向任何读取本仓库的 AI Agent（Claude Code / Codex / Cursor / WorkBuddy / Copilot 等）。
**接入本仓库后不要直接开干，先按下面的协议做两件事。**

## 一、先问，再动手

拿到本仓库时，必须先向用户确认两个问题，**不要默认全量读取**：

1. **「你要实现什么功能？」** —— 目标平台、任务类型（取数 / 导出 / 固化 skill / 查阅经验）、交付形态（表格 / 文档 / 网页）。
2. **「要定点拉取还是全量拉取？」** —— 见下方分支，不同选择读取成本差 10 倍以上。

### 分支 A：定点拉取（推荐，默认）

只读与该任务相关的一个 skill 或一份 learnings，不遍历全仓库。

```
用户任务                          →  只读这些
商品 SKU 价格/优惠/库存（淘宝/天猫） →  skills/taobao-cstore-sku-scraper/SKILL.md
                                     →  skills/taobao-cstore-sku-scraper/references/page-data-model.md
                                     →  skills/taobao-cstore-sku-scraper/references/risk-control.md
把一次操作固化为 skill              →  skills/ego-ops-to-skill/SKILL.md
读/写站点踩坑经验                   →  skills/ego-site-learnings/SKILL.md
千瓜笔记池 / 评论 / AI 解析         →  learnings/qian-gua/notes/*.md
抖店罗盘日报导出                    →  learnings/douyin-compass/notes/*.md
淘宝直播间货盘                      →  cases/live-huopan/README.md
想知道这仓库整体跑通过什么           →  docs/summary.md
```

### 分支 B：全量拉取

仅在用户明确要求「全量 / 整体了解 / 做一次评估」时执行。读取顺序：

```
README.md → docs/summary.md → skills/*/SKILL.md → learnings/*/notes/pitfalls.md → cases/*/README.md
```

全量拉取后先输出一份**能力清单摘要**（能做什么 / 不能做什么 / 需要哪些前置），再等用户指定下一步，不要立即执行抓取。

### 分支 C：只装不用

用户说「装一下」时，把目标目录复制到技能目录即可，不读取脚本内容：

```bash
cp -r skills/<name> ~/.workbuddy/skills/     # WorkBuddy
cp -r skills/<name> ~/.agents/skills/        # 其他 Agent 通用约定
```

## 二、模块索引

| 模块 | 类型 | 能做什么 | 前置 |
|---|---|---|---|
| `skills/taobao-cstore-sku-scraper` | Skill + 脚本 | 淘宝 C 店/天猫单链接全部 SKU 的优惠前价、到手价、优惠构成、库存、规格；支持多链接横比 | ego-browser、本人已登录淘宝 |
| `skills/ego-ops-to-skill` | Skill | 把跑通的操作固化成可复用 skill（五步工作流 + 质量红线） | 无 |
| `skills/ego-site-learnings` | Skill | 站点经验的读/写规范，页面改版时自愈 | 无 |
| `learnings/qian-gua` | 经验包 | 千瓜额度模型、日期面板、分栏表格、下载通道等 7 个坑 | 千瓜账号与额度 |
| `learnings/douyin-compass` | 经验包 | 抖店罗盘登录路由、导出双通道等 4 个坑 | 抖店账号 |
| `cases/live-huopan` | 案例 | 淘宝直播间货盘两层取数 + 洞察合成 | 已登录淘宝 |
| `docs/summary.md` | 文档 | 6 条已验证链路全景 + 跨站点反模式速查 | 无 |

## 三、硬约束（任何分支都适用）

1. **不做互动行为**：不自动下单、点赞、关注、发评、私信——这是风控红线，也会被平台判为异常账号。
2. **不逆向签名接口**：不实现 `mtop` 的 `sign`/`h5_tk`，不伪造请求头直连数据接口。
3. **不改指纹、不开无头、不上代理池**：使用用户本人已登录的真实浏览器是最高优先级前提。
4. **不并发**：单页串行复用；页间随机 4–9 秒，每 6 项插 10–20 秒长停；单批 ≤ 30 个链接。
5. **命中验证即停**：出现滑块/验证/登录跳转，立即停止并如实报告，不重试、不换号、不切代理。
6. **不代填凭证**：未登录时让用户自己扫码（ego 的 `task.handOff()`），不处理账号密码。
7. **不做未经确认的外部动作**：不自动提交 PR、不发消息、不上传用户数据到第三方。

## 四、交付规范

- **口径必须写明**：到手价是「平台加补后」还是「店铺优惠后」，两者不可直接横比；限时优惠有倒计时；88VIP/金币因人而异。
- **落盘验证**：下载类以文件系统为准，页面事件只是加速器。
- **AI 写入需可区分**：写回表格时用黄色 `#FFFF00` 标记 AI 填入单元格，并逐字段与人工数据校对后再落库。
- **失败如实说**：没跑通就说没跑通，给出具体缺口，不编造数据。

## 五、目录约定

```
skills/<name>/          # 每个目录 ≡ 一个可安装 skill（SKILL.md + scripts/ + references/）
learnings/<site>/       # 官方格式：manifest.json + notes/ + browser-tools/
cases/<case-name>/      # 独立可跑的最小案例，自带 README
docs/                   # 跨模块文档
```
