// 千瓜笔记搜索列表：提取当前 DOM 中已加载的笔记行
// 适用页面：app.qian-gua.com/#/material/note/* （列表视图）
// 验证日期：2026-10-26。页面改版导致返回空数组时，请更新 learnings/qian-gua/notes/pitfalls.md

export function extractNoteRows() {
  const rows = document.querySelectorAll(".list-bd .item-border-bottom");
  const out = [];
  for (const row of rows) {
    const text = row.innerText || "";
    // 行结构：标题 | 达人昵称 | 发布时间 | 互动量 | 点赞 | 收藏 | 评论 | 分享（近似）
    const timeMatch = text.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    const nums = (text.match(/[\d,]+/g) || []).map((s) => parseInt(s.replace(/,/g, ""), 10));
    // 标题取第一个换行前的非空短文本行（启发式）
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    out.push({
      title: lines[0] || "",
      author: lines.find((l) => l.length > 1 && l.length < 30 && !/^\d/.test(l) && l !== lines[0]) || "",
      publishTime: timeMatch ? timeMatch[0] : "",
      numbers: nums.slice(0, 6),
      raw: text.slice(0, 300),
    });
  }
  return out;
}
