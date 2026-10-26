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
| `electron/main.ts` | 窗口、生命周期、IPC 注册 |
| `electron/agent/` | 决策循环：`loop.ts` 主循环、`service.ts` 运行生命周期与事件广播、`llm.ts` DeepSeek 封装、`prompt.ts` 系统提示、`control.ts` 暂停闸门与失败收敛、`history.ts` 图片历史、`annotate.ts` 截图标注、`mark.ts` 落点准星 |
| `electron/agent/tools/` | 一个工具一个文件，`index.ts` 汇总注册 |
| `src/core/` | 纯能力层：`screen.ts` 窗口与坐标换算、`input.ts` nut.js、`pointer.ts` 人工接管检测、`safety.ts` 前台激活 |
| `src/shared/` | 类型、IPC 契约、网格常量（主进程与渲染进程共用） |
| `renderer/src/` | React + MUI 界面，`components/`、`hooks/` |
| `docs/` | 技术方案，改动前先读 |

`electron/agent` 不直接调用系统 API，一律经 `src/core/`。

## 不能破坏的规则

1. **一步一个动作**。放开成一次多个动作实测会盲执行并误判成功，已回退（见技术方案 §4）。提示词里这条不要放宽。
2. **坐标只有一套**：模型与工具都用截图坐标，10px 对齐走唯一的 `snapToGrid()`。换算只发生在 `core/screen.ts`（截图 → 屏幕物理像素）与 `core/input.ts`（→ nut 单位）。
3. **网格样式只有一份**：改颜色、字号、主格步长只动 `src/shared/ipc.ts` 的 `GRID` / `GRID_STYLE`，界面预览与截图标注必须同源。
4. **思考强度分档写死在循环里**：首步与失败恢复步 `high`，其余 `low`，不做配置项。
5. **图片历史只保留最近 2 张**（`KEEP_IMAGES`），更早的降级成一行文字。
6. **工具只做动作**：失败一律抛错，日志、时间线、失败收敛都由循环层处理，工具里不要重复。
7. **不泄露密钥**：`.env` 不入库；Key 不明文展示、不写日志（`run-store.ts` 已有脱敏）。
8. **暂停在步骤边界生效**；长等待靠 abort 打断，新增阻塞型工具时要把 `context.signal` 接上。

## 代码风格

- 中文交流、中文注释；注释解释「为什么」，不复述代码。
- 单文件 ≤300 行、函数 ≤30 行、嵌套 ≤3 层。
- 界面统一用 MUI `sx` + `theme.ts` 的 token，不引入 Tailwind、状态库或自研组件库。
- 提交一次只做一件事，沿用 `feat:` / `fix:` / `refactor:` / `docs:` 前缀；未经要求不 push、不 rebase、不 amend。

## 改动落点

- 调模型行为：`prompt.ts`（策略）、`loop.ts`（分档与终止条件）、`control.ts`（失败收敛）。
- 加动作能力：在 `tools/` 新建文件导出 `ToolDef`，再注册到 `tools/index.ts`；坐标用 `snapToGrid`，换算走 `core/screen.ts` 与 `core/input.ts`。
- 长流程与技能：技能系统尚未实现，设计设想见技术方案 §6；步数上限在 `src/shared/agent.ts`，`wait` 上限在 `tools/wait.ts`，时间线容量在 `useAgentRun.ts`。
- 界面：`renderer/src/components/`；主进程与渲染进程之间新增字段先改 `src/shared/`。

## 验收

改完跑 `npm run typecheck` 与 `npm run build`，再通读 diff 检查：暂停是否仍在步骤边界、watcher 是否一定 stop、日志是否脱敏、有无超出文件行数上限。`runs/` 下的运行日志（不入库）是复盘实际行为的依据。
