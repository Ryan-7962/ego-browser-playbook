// 淘宝/天猫商品详情页：提取价格区「已享受 / 可再享」促销政策文本
// 适用页面：item.taobao.com/item.htm?id=* / detail.tmall.com/item.htm?id=*
// 验证日期：2026-10-29。页面改版导致返回空数组时，请更新 learnings/taobao/notes/pitfalls.md
// 说明：促销区是纯文本，DOM 无稳定 class；结构化解析（官方立减/礼金/满减等正则）
//       见 skills/taobao-cstore-sku-scraper/scripts/report.py 的 parse_policy。

export function extractPromoLines() {
  const t = document.body.innerText.replace(/[ \t]+/g, " ");

  // 取「已享受」/「可再享」起始段，遇到后续区块关键词截断
  const seg = (start, ends) => {
    const i = t.indexOf(start);
    if (i < 0) return [];
    let s = t.slice(i + start.length, i + start.length + 420);
    for (const e of ends) {
      const j = s.indexOf(e);
      if (j > 0) s = s.slice(0, j);
    }
    const NOISE = /^[:：；;、]+$|^知道了$|^新增商品价格解释功能$|^已享受|^可再享|^领取$|^去使用$/;
    return s.split("\n").map((x) => x.trim()).filter((x) => x && !NOISE.test(x));
  };

  return {
    enjoyed: seg("已享受", ["可再享", "预计", "快递", "数量", "颜色", "规格", "配送"]),
    more: seg("可再享", ["预计", "快递", "数量", "颜色", "规格", "配送"]),
  };
}
