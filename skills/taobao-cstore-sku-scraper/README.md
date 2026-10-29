# taobao-cstore-sku-scraper

淘宝 C 店 / 天猫**单个商品链接**的全部 SKU 价格与优惠抓取。直接读详情页服务端渲染的数据，**不调接口、不点规格、零额外网络请求**。

## 能拿到什么

| 字段 | 说明 |
|---|---|
| 规格 / SKU ID | 每个可售组合一行，如「牛奶滋润面霜30g*2」 |
| 优惠前价 | 页面「优惠前」划线价 |
| 到手价 | 页面优惠后价，并标注口径（天猫「平台加补后」/ C 店「店铺优惠后」） |
| 优惠力度 / 立减金额 | 1 − 到手价 ÷ 优惠前价 |
| 优惠构成 | 官方立减 %、限时立减（直降）金额、首单礼金、店铺新客减、红包、淘金币、跨店满减、百亿补贴、赠品 |
| 库存 / 售罄标记 | 含 `quantity` 与页面文案 |

输出 `CSV` + `XLSX`（三 sheet：SKU明细 / 商品汇总 / 口径说明）。

## 怎么用

```bash
# 1. 写任务文件（ego 的 node 运行时不继承环境变量与 cwd，配置只能走固定文件）
cat > /tmp/taobao_sku_job.json <<'JSON'
{"urls":["https://item.taobao.com/item.htm?id=961483645644"],"out":"/abs/output/dir"}
JSON

# 2. 抓取（串行 + 随机间隔，自动断点续跑）
ego-browser nodejs < scripts/scrape.js

# 3. 出表
python3 scripts/report.py --dir /abs/output/dir
```

`urls` 可放多条链接做竞品横比；`force: true` 可覆盖已抓结果。

## 实测样例

| 链接 | 类型 | 结果 |
|---|---|---|
| `item.taobao.com/item.htm?id=961483645644` | 淘宝 C 店 | 10 SKU，到手 ¥17.70–75.60，官方立减 15% |
| `detail.tmall.com/item.htm?id=595622432500` | 天猫 | 12 SKU，到手 ¥12.31–24.01，官方立减 15% + 限时立减 4 元 + 淘金币 |

同一登录态连续 17 个详情页零滑块零验证，节奏与停止条件见 [`references/risk-control.md`](references/risk-control.md)。

## 边界

- 只做**读**：不点加入购物车、不下单、不做任何互动。
- 到手价是页面优惠后价，**不等于**叠加 88VIP / 消费券 / 金币余额后的最终实付。
- 「已享受」明细按默认展示 SKU 渲染，金额是单品口径；跨 SKU 以各自到手价为准。
- 限时红包、限时立减带倒计时；页面改版时按 [`references/page-data-model.md`](references/page-data-model.md) 更新取数逻辑。

完整流程与禁止项见 [`SKILL.md`](SKILL.md)。
