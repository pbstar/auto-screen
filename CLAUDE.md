# Auto Screen 开发约定

可视化桌面操作 Agent：用户选一个窗口、输入任务，Agent 循环「截图 → 视觉模型决策 → 鼠标/键盘动作 → 再截图」直到完成。设计与踩坑记录见 [docs/技术方案.md](docs/技术方案.md)。

**最终目标**是把 Web 系统与桌面应用的操作手册写成技能（`SKILL.md`）导入执行。这类任务步骤远超 30 步，还包含分钟级固定等待与周期性重复，所以项目的第一要求是**稳定**，其次才是省 token、降延迟。

## 命令

```bash
npm run typecheck
npm run build
npm run dev   # 实跑界面前先征得同意
```

静态检查（typecheck / build）通过即可交付；不要主动启动 dev server 或用浏览器实测，确需实跑先说明理由。

## 目录

| 位置 | 职责 |
|---|---|
| `src/main/` | 主进程：`index.ts` 窗口与生命周期、`ipc.ts` IPC 注册、`capture-stream.ts` 预览视频流、`config.ts` 模型与环境配置 |
| `src/preload/` | contextBridge 桥接，向渲染进程暴露 `window.autoScreen` |
| `src/agent/` | 决策循环：`loop.ts` 主循环、`service.ts` 运行生命周期与事件广播、`llm.ts` DeepSeek 封装、`prompt.ts` 系统提示、`control.ts` 暂停闸门与失败收敛、`questions.ts` 提问挂起、`history.ts` 图片历史、`annotate.ts` 截图标注、`mark.ts` 落点准星 |
| `src/agent/tools/` | 一个工具一个文件，`index.ts` 汇总注册并提供执行入口 |
| `src/agent/skills.ts` | 扫描 `skills/*/SKILL.md`，解析 frontmatter，按勾选返回技能正文 |
| `src/agent/rules.ts` | 内置规则常量 + 扫描 `rules/*.md`，规则始终注入、优先于技能 |
| `src/agent/frontmatter.ts` | 技能与规则共用的 frontmatter 解析 |
| `src/agent/run-store.ts` | 运行日志与每步截图的落盘、读取（`runs/`） |
| `src/core/` | 纯能力层：`screen.ts` 窗口与坐标换算、`input.ts` nut.js、`pointer.ts` 人工接管检测、`safety.ts` 前台激活 |
| `src/shared/` | 类型、IPC 契约、网格常量（主进程与渲染进程共用） |
| `src/renderer/` | React + MUI 界面，`components/`、`hooks/` |
| `skills/` | 技能手册，一个目录一份 `SKILL.md`；`calculator/` 是示例 |
| `rules/`（可选） | 自定义规则，一份 `.md` 一条，始终生效；目录不存在不报错 |
| `docs/` | 技术方案，改动前先读 |

`src/agent` 不直接调用系统 API，一律经 `src/core/`。

## 不能破坏的规则

1. **一步一个动作**。放开成一次多个动作实测会盲执行并误判成功，已回退（见技术方案 §4）。提示词里这条不要放宽。
2. **坐标只有一套**：模型与工具都用截图坐标，10px 对齐走唯一的 `snapToGrid()`。换算只发生在 `core/screen.ts`（截图 → 屏幕物理像素）与 `core/input.ts`（→ nut 单位）。
3. **网格样式只有一份**：改颜色、字号、主格步长只动 `src/shared/grid.ts` 的 `GRID` / `GRID_STYLE`，界面预览与截图标注必须同源。
4. **思考强度分档写死在循环里**：首步与失败恢复步 `high`，其余 `low`，不做配置项。
5. **图片历史只保留最近 2 张**（`KEEP_IMAGES`），更早的降级成一行文字。
6. **工具只做动作**：失败一律抛错，日志、时间线、失败收敛都由循环层处理，工具里不要重复。
7. **不泄露密钥**：`.env` 不入库；Key 不明文展示、不写日志（`run-store.ts` 已有脱敏）。
8. **技能靠用户勾选注入**，不做自动匹配；手册追加在规则层之后，不勾选时系统提示前缀保持不变。
9. **技能只写策略不写死坐标**：用网格相对位置描述目标，要求每一步都用新截图核对，易错点写进「注意」。
10. **暂停在步骤边界生效**；`wait` / `wait_until` / `wait_for_change` 内部每 500ms 检查暂停与终止，新增阻塞型工具必须同时接 `context.signal` 和 `context.gate`，长任务用 `context.report` 报进度。
11. **`wait_for_change` 的基线必须是本步模型看到的那张截图**（`shot.frame`）。改成「开始等待那一刻」的截图，会在模型思考的两三秒里漏掉对手已经落子的情况。检测阈值集中在 `agent/watch.ts`，调整前先看那里的实测注释。
12. **规则始终注入、不参与勾选**：内置规则写在 `src/agent/rules.ts`，自定义规则读 `rules/*.md`；优先级高于技能手册。内置规则只从代码改，不要做成可关闭或可覆盖。
13. **提问等待期间压住接管检测**：`ask_user` 挂起时 `watcher.markBusy(true)`，答复或终止时释放；回答后先激活目标窗口再放行循环，否则下一步会截到本应用，或把用户点选项误判成人工接管。

## 代码风格

- 中文交流、中文注释；注释解释「为什么」，不复述代码。
- 单文件 ≤300 行、函数 ≤30 行、嵌套 ≤3 层。
- 界面统一用 MUI `sx` + `theme.ts` 的 token，不引入 Tailwind、状态库或自研组件库。
- 提交一次只做一件事，沿用 `feat:` / `fix:` / `refactor:` / `docs:` 前缀；未经要求不 push、不 rebase、不 amend。

## 改动落点

- 调模型行为：`prompt.ts`（策略）、`loop.ts`（分档与终止条件）、`control.ts`（失败收敛）。
- 加动作能力：在 `tools/` 新建文件导出 `ToolDef`，再注册到 `tools/index.ts`；坐标用 `snapToGrid`，换算走 `core/screen.ts` 与 `core/input.ts`。
- 长流程与技能：技能系统已接入，新增技能只需在 `skills/<id>/` 下写 `SKILL.md`（frontmatter 只认 `name`、`description`），不必改代码；步数上限在 `src/shared/agent.ts`，三种等待在 `tools/wait*.ts`（引擎 `wait-runner.ts`，画面差分 `agent/watch.ts`），时间线容量在 `useAgentRun.ts`。
- 加规则：内置规则改 `src/agent/rules.ts`；自定义规则放 `rules/*.md`（frontmatter 可选，`name` 缺省用文件名），始终生效、不参与勾选。
- 界面：`src/renderer/src/components/`；主进程与渲染进程之间新增字段先改 `src/shared/`。

## 验收

改完跑 `npm run typecheck` 与 `npm run build`，再通读 diff 检查：暂停是否仍在步骤边界、watcher 是否一定 stop、日志是否脱敏、有无超出文件行数上限。`runs/` 下的运行日志（不入库）是复盘实际行为的依据。
