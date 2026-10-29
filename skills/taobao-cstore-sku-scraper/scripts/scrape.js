/**
 * 淘宝 / 天猫 单链接多 SKU 抓取（ego-browser 脚本）
 *
 * 注意：ego 的 node 运行时既不继承环境变量也不继承工作目录，
 * 因此配置必须写进固定的任务文件 /tmp/taobao_sku_job.json。
 *
 * 用法：
 *   echo '{"urls":["https://item.taobao.com/item.htm?id=123"],"out":"/abs/dir"}' > /tmp/taobao_sku_job.json
 *   ego-browser nodejs < scripts/scrape.js
 *
 * 任务文件字段：
 *   urls   必填。商品链接或纯 ID 数组（item.taobao.com / detail.tmall.com，可带 spm 长链）
 *   out    必填。输出目录，逐品写 item_<id>.json，可断点续跑
 *   force  可选。true 时忽略已存在结果重新抓取
 *
 * 原理：详情页为服务端渲染，SKU 价格与库存已内嵌在 window.__ICE_APP_CONTEXT__，
 * 直接读取，不调用任何 mtop 签名接口，无额外网络请求。
 */

const fs = await import("node:fs/promises");
const path = await import("node:path");

const JOB_FILE = "/tmp/taobao_sku_job.json";
let job;
try {
  job = JSON.parse(await fs.readFile(JOB_FILE, "utf8"));
} catch (e) {
  console.error(`读取任务文件失败：${JOB_FILE}\n${e.message}`);
  process.exit(2);
}

const OUT = job.out;
const FORCE = job.force === true;
const RAW = Array.isArray(job.urls) ? job.urls.join(",") : String(job.urls || "");

if (!OUT || !RAW) {
  console.error("任务文件缺少 out 或 urls 字段");
  process.exit(2);
}
await fs.mkdir(OUT, { recursive: true });

// 解析输入：保留给定域名，纯 ID 默认走 item.taobao.com
const targets = RAW.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((raw) => {
  const m = raw.match(/[?&]id=(\d+)/) || raw.match(/^(\d{6,})$/);
  const id = m ? m[1] : null;
  const host = /detail\.tmall\.com/.test(raw) ? "detail.tmall.com"
    : /item\.taobao\.com/.test(raw) ? "item.taobao.com"
    : /tmall\.com/.test(raw) ? "detail.tmall.com" : "item.taobao.com";
  return { id, url: id ? `https://${host}/item.htm?id=${id}` : null, raw };
}).filter((t) => t.url);

if (!targets.length) {
  console.error("无法从 SKU_URLS 解析出商品 ID");
  process.exit(2);
}

const task = await taskSpace("taobao sku scrape");
const page = task.page("p1");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (a, b) => a + Math.floor(Math.random() * (b - a));
const BLOCK = /验证|滑块|请稍等|访问受限|安全中心|亲，小二|登录后才能/;

// —— 页面内取数，返回 JSON 可序列化对象 ——
function extract() {
  const root = window.__ICE_APP_CONTEXT__ || window.__INIT_DATA__ || {};
  let node = null;
  const seen = new Set();
  (function walk(o, d) {
    if (node || !o || typeof o !== "object" || d > 14 || seen.has(o)) return;
    seen.add(o);
    if (o.skuBase && o.skuCore) { node = o; return; }
    for (const k of Object.keys(o)) walk(o[k], d + 1);
  })(root, 0);
  if (!node) return { ok: false, reason: "skuBase/skuCore 未找到" };

  const vidName = {};
  for (const p of node.skuBase.props || []) {
    for (const v of p.values || []) vidName[String(v.vid)] = v.name;
  }
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
      listPrice: info.price ? parseFloat(info.price.priceText) : null,
      listTitle: info.price ? (info.price.priceTitle || "") : "",
      finalPrice: info.subPrice ? parseFloat(info.subPrice.priceText) : null,
      finalTitle: info.subPrice ? (info.subPrice.priceTitle || "") : "",
      stock: info.quantity ?? null,
      stockText: info.quantityText || "",
    };
  });

  const t = document.body.innerText.replace(/[ \t]+/g, " ");
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

  const shopEl = document.querySelector('[class*="shopName"],[class*="ShopName"],[class*="shop-name"]');
  const item0 = node.skuCore.skuItem || {};
  const priceLabels = [...new Set(skus.map((s) => s.finalTitle).filter(Boolean))];
  return {
    ok: true,
    host: location.hostname,
    itemId: String(item0.itemId || (location.search.match(/[?&]id=(\d+)/) || [])[1] || ""),
    title: (item0.title || document.title || "")
      .replace(/\s*[-–]\s*(tmall\.com|淘宝网).*$/i, "").trim(),
    subTitle: item0.subtitle || "",
    shopName: shopEl ? shopEl.innerText.split("\n")[0].trim() : "",
    sold: (t.match(/已售\s*[\d.]+[万+]?/) || [""])[0],
    enjoyed: seg("已享受", ["可再享", "预计", "快递", "数量", "颜色", "规格", "配送"]),
    more: seg("可再享", ["预计", "快递", "数量", "颜色", "规格", "配送"]),
    activity: (t.match(/双11|双十一|618|年货节|女王节|99划算节/) || [""])[0],
    finalPriceLabel: priceLabels.join(" / "),
    skus,
  };
}

const results = [];
let blocked = false;

for (let i = 0; i < targets.length; i++) {
  const t = targets[i];
  const file = path.join(OUT, `item_${t.id}.json`);

  if (!FORCE) {
    try {
      const old = JSON.parse(await fs.readFile(file, "utf8"));
      if (old && old.skus && old.skus.length) {
        results.push({ itemId: t.id, skipped: true, skus: old.skus.length });
        console.log(`[skip] ${t.id} 已抓取（${old.skus.length} SKU）`);
        continue;
      }
    } catch (e) { /* 无历史，继续抓 */ }
  }

  try {
    await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(jitter(3500, 6000));

    const title = await page.title();
    const head = await page.evaluate(() => document.body.innerText.slice(0, 300));
    if (BLOCK.test(title) || BLOCK.test(head)) {
      console.log(`[blocked] ${t.id} ${title} —— 已停止，剩余链接未抓取`);
      blocked = true;
      break;
    }

    await page.mouse.wheel(0, jitter(200, 500), { label: "natural scroll" });
    await page.waitForTimeout(jitter(500, 1200));

    const data = await page.evaluate(extract);
    if (!data.ok) {
      await fs.writeFile(path.join(OUT, `fail_${t.id}.json`), JSON.stringify({ url: t.url, reason: data.reason }, null, 1));
      console.log(`[fail] ${t.id} ${data.reason}（页面结构可能已变，见 references/page-data-model.md）`);
      results.push({ itemId: t.id, error: data.reason });
      continue;
    }
    data.itemId = data.itemId || t.id;
    data.url = t.url;
    data.capturedAt = new Date().toISOString();
    await fs.writeFile(file, JSON.stringify(data, null, 1));
    results.push({ itemId: t.id, skus: data.skus.length, title: data.title.slice(0, 30) });
    console.log(`[ok] ${t.id} ${data.skus.length} SKU | ${data.title.slice(0, 26)} | ${(data.enjoyed || []).slice(0, 3).join(" ; ")}`);
  } catch (e) {
    console.log(`[error] ${t.id} ${String(e.message).slice(0, 90)}`);
    results.push({ itemId: t.id, error: String(e.message).slice(0, 90) });
  }

  // 节奏：单页 4–9s；每 6 个商品插入长停顿；末条不等待
  if (i < targets.length - 1) {
    const pause = (i + 1) % 6 === 0 ? jitter(12000, 20000) : jitter(4000, 9000);
    await sleep(pause);
  }
}

await fs.writeFile(path.join(OUT, "_run_summary.json"), JSON.stringify({
  finishedAt: new Date().toISOString(), blocked, targets: targets.length, results,
}, null, 1));

await task.finish({ keep: [] });
console.log(JSON.stringify({ blocked, done: results.length, out: OUT }));
if (blocked) process.exit(3);
