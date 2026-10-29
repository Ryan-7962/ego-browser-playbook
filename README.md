# ego-browser-playbook

> Ego Lite 浏览器自动化的实战方法论合集：把「电商数据调研」类任务从人肉浏览变成可重复、可校对、可自愈的自动化管线。
> 全部链路在真实业务任务中跑通（天猫 / 淘宝直播 / 千瓜 / 抖店罗盘 / 飞书交付）。

## 为什么是 ego

淘宝直播、天猫详情、千瓜这类场景**没有可编程的官方数据通道**，浏览器是唯一入口。ego（Ego Lite）的独特价值：

1. **登录态常驻**：扫码一次跨会话保持，人工只出现在必要的验证点（handOff 协议标准化）
2. **脚本批处理**：一个 Node.js 脚本跑 N 步（导航+填表+等待+验证），比截图驱动的逐动作循环少 ~44% 轮次
3. **可编程下载**：`waitForEvent("download")` + `saveAs()` 直接落盘
4. **知识可沉淀**：站点经验按官方 learnings 格式封装，页面改版可自愈

## 仓库地图

```
ego-browser-playbook/
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

## 适用与不适用

- ✅ 重复性的电商/内容平台数据采集、报表导出、页面信息补全
- ✅ 需要登录态但无 API 的「最后一公里」场景
- ❌ 自动化发布/点赞/关注等互动行为（风控红线）
- ❌ Windows 环境（Ego Lite 目前仅 macOS；Windows 建议走 CDP 方案）

## License

MIT
