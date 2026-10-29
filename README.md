# ego-browser-playbook

> Ego Lite 浏览器自动化的实战方法论合集：把「电商数据调研」类任务从人肉浏览变成可重复、可校对、可自愈的自动化管线。
> 全部链路在真实业务任务中跑通（天猫 / 淘宝直播 / 千瓜 / 抖店罗盘 / 飞书交付）。

## 为什么是 ego

淘宝直播、天猫详情、千瓜这类场景**没有可编程的官方数据通道**，浏览器是唯一入口。ego（Ego Lite）的独特价值：

1. **登录态常驻**：扫码一次跨会话保持，人工只出现在必要的验证点（handOff 协议标准化）
2. **脚本批处理**：一个 Node.js 脚本跑 N 步（导航+填表+等待+验证），比截图驱动的逐动作循环少 ~44% 轮次
3. **可编程下载**：`waitForEvent("download")` + `saveAs()` 直接落盘
4. **知识可沉淀**：站点经验按官方 learnings 格式封装，页面改版可自愈

## 让 AI 用这个仓库：先说「定点」还是「全量」

仓库根目录有 [`AGENTS.md`](AGENTS.md)。任何 Agent 接入后应先问你两件事：

1. **你要实现什么功能**（取数 / 导出 / 固化 skill / 查经验）
2. **定点拉取还是全量拉取**

**定点拉取**只读一个 skill 或一份 learnings，几十 KB；**全量拉取**会遍历 `skills/`、`learnings/`、`cases/`、`docs/`，适合做整体评估。建议默认定点——省 token，也不让 AI 去读一堆它用不上的站点细节。

## 你要做什么？按板块找

| 你想做的事 | 板块 | 入口 |
|---|---|---|
| 抓淘宝/天猫商品 SKU 价格、到手价、优惠、库存 | Skill | `skills/taobao-cstore-sku-scraper/` |
| 把一次跑通的操作固化成可复用 skill | Skill | `skills/ego-ops-to-skill/` |
| 站点踩坑经验的读/写规范 | Skill | `skills/ego-site-learnings/` |
| 千瓜笔记池 / 评论 / AI 解析 | 经验包 | `learnings/qian-gua/` |
| 抖店罗盘日报与明细导出 | 经验包 | `learnings/douyin-compass/` |
| 看一条完整链路怎么跑通 | 案例 | `cases/live-huopan/` |
| 整体能力清单与跨站点反模式 | 文档 | `docs/summary.md` |

## 仓库地图

```
ego-browser-playbook/
├── AGENTS.md                   # AI 接入协议：先问功能，再决定「定点 / 全量」拉取
├── LICENSE                     # MIT
├── skills/                     # 可直接安装的 Agent Skill
│   ├── ego-ops-to-skill/       #   把跑通的操作固化为新 skill（五步工作流+质量红线）
│   ├── ego-site-learnings/     #   站点踩坑知识库（读/写双向规则）
│   └── taobao-cstore-sku-scraper/  #   淘宝C店/天猫单链接多SKU价格+优惠+库存抓取（零接口请求）
├── learnings/                  # 站点经验包（官方 manifest+notes+browser-tools 格式）
│   ├── qian-gua/               #   千瓜：额度模型、日期面板/分栏表格/下载通道等 7 坑
│   └── douyin-compass/         #   抖店罗盘：登录路由、导出双通道、4 坑
├── cases/
│   └── live-huopan/            # 案例：淘宝直播间货盘调研（两层取数+洞察合成）
└── docs/
    └── summary.md              # 成功链路全景与资产清单
```

## 快速开始

前置：macOS + [Ego Lite](https://github.com/citrolabs/ego-lite)（开源 harness 15k★，浏览器本体另装）。

```bash
# 1. 把 skill 装进你的 Agent 技能目录
cp -r skills/ego-ops-to-skill  ~/.agents/skills/
cp -r skills/ego-site-learnings ~/.agents/skills/
cp -r skills/taobao-cstore-sku-scraper ~/.agents/skills/

# 2. 把站点经验包放到 ego 工作区（运行时未来开放 runSiteTool 后自动接入；
#    当前版本由 ego-site-learnings skill 以文档方式引用）
mkdir -p ~/.agents/skills/egobrowser/agent-workspace
cp -r learnings ~/.agents/skills/egobrowser/agent-workspace/

# 3. 跑一个案例试试（需要已登录天猫的 ego 浏览器）
cd cases/live-huopan && cat README.md
```

## 三条纪律（比脚本更重要）

1. **原生导出优先**——平台有导出功能绝不爬页面（合规、稳定、可中断重试）
2. **落盘验证**——下载类操作以文件系统为准，页面事件只是加速器
3. **AI 数据可区分可校对**——标黄 + 逐字段校对，不让自动化直接覆盖人工数据

## 反例：能读页面就别调接口

淘宝/天猫商品详情页是服务端渲染，**全部 SKU 的价格、库存、优惠文案已经在 HTML 里**（`window.__ICE_APP_CONTEXT__` 的 `skuBase` + `skuCore`）。

同一份 SKU 数据，商业插件走扩展后台 + 云端签名接口调 `mtop`（慢、有配额、随平台改版失效）；`skills/taobao-cstore-sku-scraper` 直接读页面变量：**零额外请求，网络行为与真人打开一次详情页完全相同**。实测 17 个商品 / 102 个 SKU 连续抓取，零滑块零验证。

这个方法可迁移：任何 SSR 站点，先看页面里有没有已经渲染好的结构化数据，再考虑接口和 DOM 交互。

## 插件生态：浏览器能借扩展放大能力

ego 是真实 Chromium，**已安装的浏览器扩展照常生效**。很多「平台内才有、没有 API」的能力可以直接借用，不必从页面里抠。

### 推荐：店透视（[diantoushi.com](https://diantoushi.com)）

装好后打开淘宝/天猫商品页，右侧出现面板，能直接导出：

| 功能 | 产物 | 实测口径 |
|---|---|---|
| SKU 预览 → 导出表格 | xlsx，11 列：商品信息 / 商品ID / 链接 / 店铺 / 销量 / SKU信息 / SKUID / 价格 / 券后价格 / 库存 / 规格 | 单商品一键；数值与页面一致（12/12 对齐） |
| 全店导出 | xlsx，商品级（17 行） | **价格要再点「获取价格」**，且是单品**起价**，拿不到每个 SKU |
| 商品图下载 | zip：主图 / SKU 图 / 详情长图 | 文件名含规格名，可与 SKU 表对齐 |
| 手淘优惠 | 一行促销摘要 | 只有文案拼接，不结构化 |

边界（实测，别踩）：

- **SKU 级仍要逐品导出**：17 个商品 = 17 次点击 + 17 个文件。单商品拿全量 SKU 它很省事；整店/多店横比不如脚本。
- 价格是「起价」不是全 SKU。要全 SKU 用 `skills/taobao-cstore-sku-scraper`。
- 平台自身有限流提示（「双 11 期间服务较慢，请勿频繁使用商品资料下载功能」），批量下载要放慢、分批。
- 它的请求走**扩展后台**，不出现在页面 `fetch`/`XHR` 里——想监控或拦截插件流量，用 `window.fetch` 钩子是看不到的，得走 CDP 或扩展侧。

### 挑插件给 AI 用的检查清单

1. 有没有**原生导出**（xlsx / csv / zip）？有就先导，别爬 DOM。
2. 下载走页面事件还是 `chrome.downloads`？后者**捕获不到 download 事件**，只能以文件系统落盘为准。
3. 面板是不是 Element UI / Vue 受控组件？是就用原生 setter + input 事件。
4. 有没有配额 / 限流提示？有就按提示分片、放慢。
5. 是否要额外登录？决定是否需要 `handOff()` 交还用户操作。

## 淘宝/天猫抓取：现成能力 · 建议提示词 · 已规避的风控

### 现在就能做的（不用自己写代码）

| 需求 | 一句话触发 |
|---|---|
| 单商品全部 SKU 的价格与优惠 | 「用 taobao-cstore-sku-scraper 抓 <链接> 的全部 SKU，出价格 + 到手价 + 优惠构成 + 库存」 |
| 多个竞品链接横比 | 「抓这 3 个链接，按 SKU 对齐价格带与优惠力度」 |
| 只看政策不看价格 | 「只提取每个商品的优惠构成，说明是官方立减还是直降」 |
| 整店批量 | 「先跑店铺分类页拿全部商品 ID，再用 skill 批量抓」 |

### 建议提示词（复制即用）

```
用本仓库的 skills/taobao-cstore-sku-scraper 抓取：
<商品链接 1>
<商品链接 2>

输出：每个 SKU 的规格、优惠前价、到手价、优惠力度、优惠构成、库存。
要求：
1. 说明到手价口径（平台加补后 / 店铺优惠后），两者不要混算
2. 标出售罄 SKU
3. 串行访问，不要并发，不要调接口
```

### 已经规避掉的反爬机制

| 机制 | 常见打法为什么被拦 | 本仓库的做法 |
|---|---|---|
| 登录态校验 | 无头 + 匿名访问 → 强制登录或验证 | 用本人已登录的真实浏览器 |
| 频率 / 等间隔检测 | 固定 `sleep` 批量请求 | 4–9 秒随机 + 每 6 项长停 |
| 接口签名 `h5_tk`/`sign` | 逆向签名，随平台改版失效 | 不调接口，只读 SSR 渲染结果 |
| 指纹检测（webdriver / canvas） | 打补丁反而留痕 | 不改指纹、不改 UA、不开无头 |
| 并发特征 | 多 tab 同时请求 | 单页串行复用 |
| IP 异常 | 代理池跳地域 | 本机直连，住宅 IP 天然一致 |

实测基线：同一登录态连续访问 3 次店铺列表页 + 17 个天猫详情页 + 2 个 C 店详情页，**零滑块、零验证**。

### 不要做的事

- 互动行为（下单 / 点赞 / 关注 / 发评）：红线，也会把账号标记为异常。
- 逆向 `mtop` 签名接口：违反平台条款；页面已有数据，收益为零。
- 单批超过 30 个链接：拆批，间隔 10 分钟以上。

## 适用与不适用

- ✅ 重复性的电商/内容平台数据采集、报表导出、页面信息补全
- ✅ 需要登录态但无 API 的「最后一公里」场景
- ❌ 自动化发布/点赞/关注等互动行为（风控红线）
- ❌ Windows 环境（Ego Lite 目前仅 macOS；Windows 建议走 CDP 方案）

## License

MIT，见 [`LICENSE`](LICENSE)。
