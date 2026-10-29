const task = await taskSpace(5);
const p2 = task.page("p2");
const fs = await import("node:fs/promises");
const ids = [
  ["661","1078525539142"],["656","984024689138"],["655","1084471486085"],["654","1085533397499"],
  ["608","867686756480"],["607","838737605594"],["606","1058324331078"],["605","951769123203"],
  ["596","1050906064710"],["595","1083087463531"],["541","1043934463754"],["520","1019862222334"],
  ["360","1080033092217"],["317","1049490773554"],["316","1085789644085"],["276","950715248205"],
  ["232","974366078972"],["86","693247195163"],["51","1085862244949"],["44","1087696181433"],
  ["30","1079863229089"],["25","1085838888088"],["22","965441493774"],["21","777528954828"]
];
const out = [];
for (const [num, id] of ids) {
  const rec = { num, id, url: `https://detail.tmall.com/item.htm?id=${id}` };
  try {
    await p2.goto(rec.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await p2.waitForTimeout(4200);
    const d = await p2.evaluate(() => {
      const t = document.body.innerText;
      return { title: document.title, text: t };
    });
    rec.title = d.title;
    const t = d.text;
    const jam = t.match(/超?\s*[0-9.]+\s*万?\s*人加购/);
    rec.jam = jam ? jam[0].replace(/\s+/g, "") : "";
    const sold = t.match(/已售\s*[0-9.]+\s*万?\+?/);
    rec.sold = sold ? sold[0].replace(/\s+/g, "") : "";
    const price = t.match(/￥\s*([0-9]+(\.[0-9]+)?)/);
    rec.detailPrice = price ? price[1] : "";
    // 参数信息 block
    const pi = t.indexOf("参数信息"), pe = t.indexOf("图文详情");
    rec.params = pi >= 0 ? t.slice(pi + 4, pe > pi ? pe : pi + 1200).split("\n").map(s => s.trim()).filter(Boolean) : [];
    const arr = rec.params;
    const gi = arr.indexOf("功效"), bi = arr.indexOf("品牌");
    rec.gongxiao = gi > 0 ? arr[gi - 1] : "";
    rec.brand = bi >= 0 ? (arr[bi + 1] || "") : "";
    // SKU 规格
    const lines = t.split("\n").map(s => s.trim()).filter(Boolean);
    const qIdx = lines.lastIndexOf("数量");
    const skuStart = lines.findIndex((l, i) => l === "香味" && i > lines.length / 2);
    rec.skus = (skuStart > 0 && qIdx > skuStart) ? lines.slice(skuStart + 1, qIdx).filter(l => !/^万人加购$/.test(l)) : [];
    rec.captcha = /滑块|验证码|安全验证/.test(t);
    rec.ok = true;
  } catch (e) {
    rec.ok = false; rec.err = String(e).slice(0, 200);
  }
  out.push(rec);
  console.log(num, rec.ok, rec.brand || "", rec.jam || "-", rec.sold || "-", (rec.title || "").slice(0, 30));
}
await fs.writeFile("/Users/ryan/WorkBuddy/2026-10-21-15-22-58/live_liujiaqi/detail_fresh.json", JSON.stringify(out, null, 1));
console.log("saved", out.length, "ok:", out.filter(r => r.ok).length);
