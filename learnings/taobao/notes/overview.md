# 淘宝/天猫（taobao.com / tmall.com）站点总览

## 基本事实

- **淘宝 C 店与天猫共用同一套 PC 详情前端**：`item.taobao.com/item.htm?id=<id>`（C 店）与 `detail.tmall.com/item.htm?id=<id>`（天猫）。同一 id 在两个域名下可能都能打开，但**优惠口径不同**（见下文口径差异）。
- 链接里的 `spm`、`skuId`、`mi_id`、`priceTId` 等参数不影响取数，只需数字 `id`。**淘口令/短链无法直接解析出 id**：先在浏览器打开一次，取跳转后的 `item.htm?id=`。
- 登录态跨会话保持；未登录时用 ego 的 `task.handOff()` 让用户自己扫码，不代填账号密码。
- 前置检查：`ego-browser --version` 可用（Ego Lite 已安装）；浏览器处于用户本人已登录状态。

## 关键页面

| 页面 | URL 形态 | 用途 |
|---|---|---|
| 商品详情页 | `item.taobao.com/item.htm?id=<id>` / `detail.tmall.com/item.htm?id=<id>` | SKU 价格/优惠/库存（服务端渲染直读） |
| 搜索结果页 | `s.taobao.com/search?q=<关键词>` | 品类 Top 商品（注意反爬与假排序坑，见 pitfalls） |
| 直播间 | `live.taobao.com`（liveEpisodeId） | 直播货盘调研（完整案例见 `cases/live-huopan/`） |

## 数据获取通道（优先级从高到低）

### 通道 1：店透视插件原生导出（优先）

店透视（diantoushi.com 的浏览器插件）寄生在详情页上，提供两条原生导出：

**SKU 表格导出**（2026-10 实测）：

```
详情页 → 工具栏「下载」→「SKU预览」→ 切到「导出表格」标签 → 右上「导出表格」按钮 → 点「确定」
```

- 文件落 `~/Downloads/店透-SKU预览-表格-<商品ID>-<日期>.xlsx`，约 11 列（SKUID/价格/券后价/库存等）
- **券后价列部分位数被掩码**——导出表按文本处理价格，不要当数值直接计算
- 下载走 `chrome.downloads` 后台通道，**页面级 download 事件捕获不到**，必须用文件系统落盘验证（`ls -lt ~/Downloads`）

**商品图打包下载**（2026-10 实测）：

```
详情页 → 工具栏「下载」→「商品图下载」（.downBox 子菜单）
├── 自定义下载 / 下载全部（单文件/多文件）/ 主图 1:1 / 仅主图视频 / 仅SKU图 / 详情图 / 下载excel
```

- 「下载全部（单文件）」：el-progress 进度环走完后，zip 落 `~/Downloads/店透视_下载全部（单文件）_ID<商品ID>_<YYYYMMDD>.zip`
- zip 内容：1:1 主图 + `SKU图_01~18`（**文件名含规格名，与 SKU 表对应**）+ 详情长图切分
- **zip 内文件名是 GBK 编码**，解压工具按 cp437 显示会乱码，需 `cp437→gbk` 转码

### 通道 2：服务端渲染数据直读（零接口请求）

详情页全部 SKU 数据已内嵌在页面里，读 `window.__ICE_APP_CONTEXT__` 即得（结构与字段含义见 `skills/taobao-cstore-sku-scraper/references/page-data-model.md`）：

```
window.__ICE_APP_CONTEXT__.loaderData.home.data.res
├── item / seller      # 标题、店铺
├── skuBase            # props[]（规格名）+ skus[]（skuId + propPath）
└── skuCore.sku2info   # 按 skuId：price（优惠前）/ subPrice（到手价）/ quantity（库存）
```

- 请求量与真人打开一次详情页完全相同——这既是速度优势也是风控优势
- 配套 browser-tools：`extract_sku_data`、`extract_promo_lines`；整链路脚本见 `skills/taobao-cstore-sku-scraper/scripts/scrape.js`
- 兜底顺序：`__ICE_APP_CONTEXT__` → `window.__INIT_DATA__`（老版详情页）→ 都没有 skuBase/skuCore 即页面已改版，**不要盲目重试**，先让用户截价格区截图再改选择器

### 通道 3：页面 DOM 交互（最后手段）

点规格逐个读 DOM：1 个商品几十次交互，风控风险与耗时都不划算。仅在通道 1/2 全失效时用。

## 口径差异（写报告必须说明）

| 页面 | `subPrice.priceTitle` | 含义 |
|---|---|---|
| 天猫 | 平台加补后 | 含平台补贴，接近用户实付参考 |
| 淘宝 C 店 | 店铺优惠后 | 只减店铺优惠，不含平台券/红包，数值偏高 |

**天猫与 C 店到手价不可直接横比**；跨店比较前先看「到手价口径」列。限时优惠带倒计时；88VIP/消费券/淘金币因人而异，最终以下单页为准。

## 节奏与风控基线（2026-10 实测）

同一登录态下：店铺列表页 3 次 + 天猫详情页 17 个 + C 店详情页 2 个，**零滑块、零验证码**。核心参数：

| 参数 | 值 |
|---|---|
| 单页基础等待 | 3500–6000 ms |
| 页间间隔 | 4000–9000 ms（随机） |
| 长停顿 | 每 6 个商品 12000–20000 ms |
| 单次任务上限 | ≤ 30 个链接，超限分批、批间隔 ≥ 10 分钟 |

完整硬约束（不并发、不上代理池、不逆向 mtop 签名接口、命中验证即停）见 `skills/taobao-cstore-sku-scraper/references/risk-control.md`。

## 关联资产

- `skills/taobao-cstore-sku-scraper/` — 单链接多 SKU 抓取整链路（scrape.js + report.py）
- `cases/live-huopan/` — 淘宝直播间货盘调研完整案例
- `docs/summary.md` — 跨站点反模式速查
