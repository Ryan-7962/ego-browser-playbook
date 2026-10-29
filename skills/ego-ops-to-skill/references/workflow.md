# ego-ops-to-skill 工作流详细规格

## 1. index.json 元数据 schema（参考 iss-tools/ego-to-skill，适配 WorkBuddy）

```json
{
  "name": "qiangua-note-pool",
  "description": "千瓜精品笔记池导出：筛选→报告生成→下载→CSV 清洗",
  "triggers": ["千瓜导出", "笔记池", "qiangua export"],
  "site": "app.qian-gua.com",
  "operator_prereq": ["Ego Lite 安装", "千瓜账号扫码登录"],
  "auto_deps": ["lark-cli", "openpyxl"],
  "human_touchpoints": ["首次登录扫码", "导出额度确认"],
  "agent_instructions": "先读 learnings/qian-gua/notes/pitfalls.md，再执行工作流",
  "verification": [
    "报告任务出现在数据导出历史",
    "xlsx 落盘且行数 = 预期 N",
    "CSV utf-8-sig 且列数 27"
  ]
}
```

字段规则：
- `triggers`：3-6 个，含中文口语与英文关键词
- `human_touchpoints`：所有必须人工介入的点，一个都不能漏（这是「同事开箱体验」的关键承诺）
- `verification`：可机器判断的成功判据，Step 4 验证时逐条打勾

## 2. SKILL.md 模板

```markdown
---
name: <skill-name>
description: <一句话> + 触发词
---

# <skill-name>

> 前置：<账号/插件/额度要求> ｜ 人工介入点：<列表>

## 输入参数
| 参数 | 默认 | 说明 |
|---|---|---|

## 工作流
### Step N — <动作>
\`\`\`js
// ego-browser nodejs heredoc，可直接运行
\`\`\`
✅ 验证：<判据>

## 踩坑与自愈
- <坑> → <解法>（同步自 learnings/<site>/notes/pitfalls.md）

## 产出
- <文件路径模式>
```

## 3. 登记与发现（merge）

三个发现入口，生成后全部落实：
1. `REGISTRY.md` 追加（本 skill 目录下）
2. 若涉及站点踩坑 → 更新 `~/.workbuddy/skills/egobrowser/agent-workspace/learnings/<site>/notes/pitfalls.md`
3. 告知用户 skill 已就绪 + 一句触发词示例

## 4. 参考实现

- 上游：github.com/iss-tools/ego-to-skill（bin/merge_skills.js 扫描 scripts/*/index.json 重新生成 SKILL.md 的模式）
- 官方 learnings 格式：github.com/citrolabs/ego-lite `skills/ego-browser/learnings/<site>/manifest.json`
  - manifest: { id, name, domains[], notes[], nodeTools{callable}, browserTools{page JS} }
  - 安装版 0.6.x 运行时未暴露 runSiteTool/learnContext 助手 → learnings 目前以「Agent 可读文档」方式被 skill 引用；运行时未来开放后通过 EGO_BROWSER_AGENT_WORKSPACE 环境变量自动接入（目录已按官方结构摆放）

## 5. 质量红线（生成 skill 时的否决项）

- ❌ 裸坐标点击（除非无任何 DOM 语义的 canvas，且必须写分辨率前提）
- ❌ 无验证点的下载/写入步骤
- ❌ AI 产出直接覆盖人工数据（必须标黄+校对）
- ❌ 把账号密码/cookie 写进 skill 文件
- ❌ 自动化发布/点赞/关注等互动行为（风控红线）
