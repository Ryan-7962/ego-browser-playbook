# 千瓜页面自动化踩坑清单（2026-10 实证）

每条格式：现象 → 根因 → 解法。**遇到页面改版优先来这里查，改版后请更新本文件（append-only，标注日期）。**

## 1. 日期范围面板（el-date-range-picker 变体）

- **现象**：标准 Element UI 选择器全部失灵——`.el-date-picker__header-label` 匹配不到月份、`td.available` 不存在。
- **根因**：千瓜定制版面板，月份标签是**无 class 的 `<div>2026 年 10 月</div>`**（header 里最后一个 div）；单元格类名是 `normal/prev-month/next-month + disabled`，**没有 available 类**。
- **解法**：
  - 读月份：`header.querySelectorAll("div")` 取最后一个的 textContent，正则 `(\d+) 月`。
  - 可选判定：`td:not(.disabled)` + span 文本匹配日期。
  - **左右面板联动**：点右栏 next 后左栏也跟着动，导航循环里必须每次重新读两侧标签。
  - 设置后验证：`.el-date-editor input` 的两个 value。
- 改版自查：2026-10-26 验证有效。

## 2. el-table 分栏克隆（固定列）

- **现象**：主表行 innerText 里找不到「下载/删除/操作」按钮。
- **根因**：el-table 固定列会渲染克隆表；操作列在右侧克隆行里（只含「下载|删除」文本），与主表行同索引。
- **解法**：`document.querySelectorAll(".el-table__row")` 过滤 `innerText.includes("删除")` 得到右列克隆行集，按行索引对齐点击。379 个 .el-checkbox 之类的总数 = 主表+克隆表叠加，别直接当行数用。

## 3. 下载通道

- **现象**：`waitForEvent("download")` 部分场景捕获不到。
- **根因**：千瓜报告下载走页面级下载（**可捕获**）；但店透视等插件下载走 `chrome.downloads` 后台通道（**不可捕获**）。
- **解法**：千瓜用 download 事件 + `dl.saveAs()`；插件类下载武装事件 + **文件系统验证**（`ls -lt ~/Downloads`）双保险，超时后先查落盘再重试。

## 4. 弹窗表单填写（Vue 输入框）

- **现象**：`page.fill()` 对某些 input 失效或值不生效。
- **根因**：Vue 受控组件需要 input 事件；readonly 日期框禁止 fill。
- **解法**：原生 setter + dispatchEvent：
  ```js
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "1000");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  ```

## 5. 「AI 解析」提问的三个坑

- **双发陷阱**：发送后出现 network error 弹窗时，**第一次发送往往已成功**。点确定关闭后先查「提问：n/20」计数是否 +1，**只有计数没变才允许重发**，否则双扣额度。
- **僵尸流**：流式中断后 `.send-btn.stop-btn` 残留、`.send-btn.active` 消失 → 后续所有发送静默失败（evaluate 点不到按钮）。点停止/重开会话均无效，**需刷新页面恢复**。
- **答案提取**：面板 innerText 不含 textarea placeholder（定位输入框别搜「请输入」）；提取回答要按「问题文本 lastIndexOf + 已深度思考」定位，否则会把上一题答案重复存档。

## 6. 坐标换算

- **现象**：按截图坐标 mouse.click 落点错位。
- **根因**：视口宽度（如 1774px）与截图宽度（如 1080px）不一致，截图被等比缩小。
- **解法**：坐标类操作一律先 `getBoundingClientRect()` 取真实中心点，截图只用于人眼确认。

## 7. 按钮不是 button 标签

- 「AI 解析笔记」按钮是 `div.select-ai-note-btn`，「开始解析」是 `el-button qg-btn`。`querySelectorAll("button")` 会漏掉 div 按钮；文本定位兜底用 `*` 全标签扫描。
