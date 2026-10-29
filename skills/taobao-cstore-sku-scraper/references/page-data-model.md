# 详情页数据模型（2026-10 实测）

## 页面与前端

淘宝 C 店与天猫商品页使用同一套 PC 详情前端。实测域名：

| 场景 | 链接形态 | 说明 |
|---|---|---|
| 淘宝 C 店 | `item.taobao.com/item.htm?id=<id>` | 个人店/企业店 |
| 天猫 | `detail.tmall.com/item.htm?id=<id>` | 品牌旗舰店/专卖店 |

同一 id 在两个域名下可能都能打开，但**优惠口径不同**（见文末）。链接带 `spm`、`skuId`、`mi_id`、`priceTId` 等参数不影响取数，只需 `id`。

## 数据位置（关键）

SKU 数据由服务端渲染直接写进页面，**不需要触发任何 XHR**：

```
window.__ICE_APP_CONTEXT__.loaderData.home.data.res
├── item            # 标题、副标题等
├── seller          # 店铺信息
├── skuBase
│   ├── props[]     # [{ name: "颜色分类", values: [{ vid: 8394403151, name: "..." }] }]
│   └── skus[]      # [{ skuId: "6271958887712", propPath: "1627207:8394403151" }]
└── skuCore
    ├── skuItem     # { itemId, title, subtitle }
    └── sku2info    # { "<skuId>": { price:{priceTitle,priceText,priceMoney}, subPrice:{...}, quantity, quantityText } }
```

要点：

- `propPath` 是 `pid:vid` 用 `;` 连接；**取 vid 部分**再去 `props.values` 里换成名字。直接取第一段会得到 `-1` 这类属性 id。
- `sku2info` 的 key 可能比 `skus` 多一个 `"0"`（默认/区间聚合），按 skuId 取即可，不要遍历 key。
- `price.priceText` = 优惠前价；`price.priceTitle` 一般是「优惠前」。
- `subPrice.priceText` = 页面优惠后价，`subPrice.priceTitle` 是口径名（天猫「平台加补后」/ C 店「店铺优惠后」）。
- 售罄 SKU 只有 `price`，没有 `subPrice`；`quantity` 可能为 0。

## 促销政策

详情页价格区有「已享受」和「可再享」两段纯文本，按行拆即可（DOM 无稳定 class）：

```
已享受:
¥6首单礼金店铺新客专享 即时可用
官方立减20%省10元
2元红包24:58
淘金币已抵1.49元
店铺新客减6元
可再享:
满200减25
```

识别用的正则（`scripts/report.py` 中的 `parse_policy`）：

| 字段 | 正则 | 样例 |
|---|---|---|
| 官方立减 | `官方立减\s*(\d+)%\s*省([\d.]+)元` | 官方立减20%省10元 |
| 限时立减/直降 | `限时立减\s*([\d.]+)元` / `直降\s*([\d.]+)元` | 限时立减39.9元 |
| 首单礼金 | `[¥￥]\s*([\d.]+)\s*首单礼金` | ¥6首单礼金 |
| 店铺新客减 | `店铺新客减\s*([\d.]+)元` | 店铺新客减6元 |
| 红包 | `([\d.]+)元红包` | 2元红包24:58（含倒计时） |
| 淘金币 | `淘金币已抵\s*([\d.]+)元` | 淘金币已抵1.49元 |
| 满减 | `满\s*(\d+)\s*减\s*(\d+)` | 满200减25 |
| 百亿补贴 / 赠品 | 关键词 / 标题含「买N得M」 | 百亿补贴、买1得3 |

噪声行需过滤：`:`、`知道了`、`新增商品价格解释功能`、`已享受`、`可再享`。

## 兜底与失效判断

1. `__ICE_APP_CONTEXT__` 不存在 → 尝试 `window.__INIT_DATA__`（老版详情页）。
2. 两者都没有 `skuBase`/`skuCore` → 页面结构已变。此时**不要盲目重试**：保存 `fail_<id>.json`，让用户截一张价格区截图，再按新 DOM 改 `scripts/scrape.js` 的 `extract()`。
3. 最后手段才是点规格读 DOM（每个 SKU 一次交互，1 个商品几十次请求，风控风险和耗时都不划算）。

## 口径差异（写报告时必须说明）

| 页面 | `subPrice.priceTitle` | 含义 |
|---|---|---|
| 天猫 | 平台加补后 | 含平台补贴，通常是用户实付参考 |
| 淘宝 C 店 | 店铺优惠后 | 只减店铺优惠，**不含平台券/红包**，数值偏高 |

因此跨店比较前先看「到手价口径」列；天猫与 C 店的到手价不可直接横比。
