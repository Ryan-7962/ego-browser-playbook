// 淘宝/天猫商品详情页：从 window.__ICE_APP_CONTEXT__ 提取全部 SKU 价格/库存/规格
// 适用页面：item.taobao.com/item.htm?id=* / detail.tmall.com/item.htm?id=*
// 验证日期：2026-10-29。页面改版导致 ok:false 时，请更新 learnings/taobao/notes/pitfalls.md
// 口径提醒：天猫 subPrice=「平台加补后」，C 店=「店铺优惠后」，两者不可直接横比。

export function extractSkuData() {
  const root = window.__ICE_APP_CONTEXT__ || window.__INIT_DATA__ || {};
  let node = null;
  const seen = new Set();
  (function walk(o, d) {
    if (node || !o || typeof o !== "object" || d > 14 || seen.has(o)) return;
    seen.add(o);
    if (o.skuBase && o.skuCore) { node = o; return; }
    for (const k of Object.keys(o)) walk(o[k], d + 1);
  })(root, 0);
  if (!node) return { ok: false, reason: "skuBase/skuCore 未找到（页面结构可能已改版）" };

  // propPath 是 pid:vid 用 ; 连接；取 vid 段去 props.values 换名字（pitfalls #5）
  const vidName = {};
  for (const p of node.skuBase.props || []) {
    for (const v of p.values || []) vidName[String(v.vid)] = v.name;
  }

  // 按 skuBase.skus[].skuId 取数，不遍历 sku2info 的 key（pitfalls #6）
  const s2i = node.skuCore.sku2info || {};
  const skus = (node.skuBase.skus || []).map((s) => {
    const info = s2i[s.skuId] || {};
    const names = String(s.propPath || "").split(";").map((tok) => {
      const parts = tok.split(":");
      return vidName[parts[parts.length - 1]] || parts[parts.length - 1];
    }).filter(Boolean);
    return {
      skuId: s.skuId,
      spec: names.join(" / "),
      listPrice: info.price ? parseFloat(info.price.priceText) : null,      // 优惠前价
      finalPrice: info.subPrice ? parseFloat(info.subPrice.priceText) : null, // 到手价；售罄 SKU 无此字段（pitfalls #7）
      finalTitle: info.subPrice ? (info.subPrice.priceTitle || "") : "",   // 到手价口径
      stock: info.quantity ?? null,
      stockText: info.quantityText || "",
    };
  });

  const item0 = node.skuCore.skuItem || {};
  const shopEl = document.querySelector('[class*="shopName"],[class*="ShopName"],[class*="shop-name"]');
  const text = document.body.innerText.replace(/[ \t]+/g, " ");
  const priceLabels = [...new Set(skus.map((s) => s.finalTitle).filter(Boolean))];

  return {
    ok: true,
    host: location.hostname,
    itemId: String(item0.itemId || (location.search.match(/[?&]id=(\d+)/) || [])[1] || ""),
    title: (item0.title || document.title || "")
      .replace(/\s*[-–]\s*(tmall\.com|淘宝网).*$/i, "").trim(),
    shopName: shopEl ? shopEl.innerText.split("\n")[0].trim() : "",
    sold: (text.match(/已售\s*[\d.]+[万+]?/) || [""])[0],
    finalPriceLabel: priceLabels.join(" / "),
    skus,
  };
}
