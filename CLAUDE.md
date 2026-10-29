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
| `src/main/` | 主进程：`index.ts` 窗口与生命周期、`ipc.ts` IPC 注册、`capture-stream.ts` 预览视频流、`config.ts` 模型配置（`userData/model.json`） |
| `src/preload/` | contextBridge 桥接，向渲染进程暴露 `window.autoScreen` |
| `src/agent/` | 决策循环：`loop.ts` 主循环、`run-context.ts` 运行上下文、`effect.ts` 动作效果核对、`scripts.ts` 技能脚本注册、`script-runner.ts` 脚本逐步执行、`frame.ts` 单帧采样、`plan.ts` 开始前定流程、`verify.ts` 完成后核对、`service.ts` 运行生命周期与事件广播、`llm.ts` 模型请求入口 `chat()`、`prompts/` 各类系统提示、`control.ts` 暂停闸门与失败收敛、`questions.ts` 提问挂起、`distill.ts` 技能沉淀、`event-log.ts` 事件落日志、`history.ts` 图片历史、`annotate.ts` 截图标注、`mark.ts` 落点准星 |
| `src/agent/tools/` | 一个工具一个文件，`index.ts` 汇总注册并提供执行入口 |
| `src/agent/skills.ts` | 扫描 `skills/*/SKILL.md`，解析 frontmatter，按勾选返回技能正文（`scripts/*.json` 一并读取） |
| `src/agent/frontmatter.ts` | 技能 frontmatter 解析 |
| `src/agent/run-store.ts` | 运行日志与每步截图的落盘、读取（`runs/`） |
| `src/core/` | 纯能力层：`screen.ts` 窗口与坐标换算、`input.ts` nut.js、`pointer.ts` 人工接管检测、`safety.ts` 前台激活 |
| `src/shared/` | 类型、IPC 契约、网格常量、脚本格式（`script.ts`，主进程与渲染进程共用） |
| `src/renderer/` | React + MUI 界面，`components/`、`hooks/` |
| `skills/` | 技能手册，一个目录一份 `SKILL.md`；`calculator/` 是示例 |
| `docs/` | 技术方案，改动前先读 |

`src/agent` 不直接调用系统 API，一律经 `src/core/`。

## 不能破坏的规则

1. **一步一个动作**。放开成一次多个动作实测会盲执行并误判成功，已回退（见技术方案 §4）。提示词里这条不要放宽。
2. **坐标只有一套**：模型与工具都用截图坐标，10px 对齐走唯一的 `snapToGrid()`。换算只发生在 `core/screen.ts`（截图 → 屏幕物理像素）与 `core/input.ts`（→ nut 单位）。
3. **网格样式只有一份**：改颜色、字号、主格步长只动 `src/shared/grid.ts` 的 `GRID` / `GRID_STYLE`，界面预览与截图标注必须同源。
4. **思考强度分档写死在循环里**：规划与最终核对用 `high`，执行步只在失败恢复（工具失败或核对未通过）后用 `high`，其余 `low`，不做配置项。
5. **图片历史只保留最近 2 张**（`KEEP_IMAGES`），更早的降级成一行文字。
6. **工具只做动作**：失败一律抛错，日志、时间线、失败收敛都由循环层处理，工具里不要重复。
7. **不泄露密钥**：模型配置只存在 `userData/model.json`（0600），不随仓库走，不引入 `.env` 读取；Key 不明文展示、不写日志（`run-store.ts` 已有脱敏），IPC 只回传脱敏后的提示。
8. **技能靠用户勾选注入**，不做自动匹配；手册追加在安全底线之后，不勾选时系统提示前缀保持不变。
9. **技能只写策略不写死坐标**：用网格相对位置描述目标，要求每一步都用新截图核对，易错点写进「注意」。
10. **暂停在步骤边界生效**；`wait` / `wait_until` / `wait_for_change` 内部每 500ms 检查暂停与终止，新增阻塞型工具必须同时接 `context.signal` 和 `context.gate`，长任务用 `context.report` 报进度。
11. **`wait_for_change` 的基线必须是本步模型看到的那张截图**（`shot.frame`）。改成「开始等待那一刻」的截图，会在模型思考的两三秒里漏掉对手已经落子的情况。检测阈值集中在 `agent/watch.ts`，调整前先看那里的实测注释。
12. **安全底线写死在系统提示**：操作范围、不可撤销动作、验证与凭据、如实汇报四条边界写在 `prompts/agent.ts`，始终注入、优先级高于技能手册，不要做成可关闭或可覆盖；用户想追加约束就写进技能手册，不另设规则目录。
13. **提问等待期间压住接管检测**：`ask_user` 挂起时 `watcher.markBusy(true)`，答复或终止时释放；回答后先激活目标窗口再放行循环，否则下一步会截到本应用，或把用户点选项误判成人工接管。
14. **自动沉淀只读轨迹、绝不覆盖**：只在任务自然完成（`completed`）且步数 ≥ 3 时触发，材料只有文本轨迹（工具、参数、结果，以及每步对界面的判断）与目标窗口标题，不喂截图；写到 `skills/<slug>/`（slug 由模型给出，2~5 个英文小写词、短横线连接；缺失或不合规时回退 `auto-<时间>`），撞名加序号，绝不覆盖已有技能，也不自动勾选；目录与文件名用英文 slug，界面和手册里仍用中文名；手册只写通用流程，不写本次的收件人、账号、文件名、数值等具体数据（用「任务给定的…」描述）；失败或跳过都不能改变任务结果（`finished` 先发、界面照常回到空闲）。任务已结束、只剩沉淀在跑时，暂停与终止只取消沉淀、不再发事件。
15. **完成必须经核对裁决**：模型不再调用工具后必须再请求一次核对（任务、流程、结论、最后一张截图），不通过就把差距回灌继续修，连续两次不通过以 `unverified` 结束且不得自动沉淀；解析不出结论时按通过处理，格式问题不能卡死任务。规划与核对的用量同样计入时间线与日志。
16. **动作要核对效果**：每步用 `agent/effect.ts` 比对上一动作前后的原始画面签名（`annotateCapture` 在画网格前采样）。click / type / key / drag 之后画面完全没变，就把「上一步没有生效」写进下一步的截图说明并升级到 `high`——模型会把「画面没变」解释成没焦点然后原地重试。连续 2 次无变化要求换方式、4 次建议 `ask_user`、6 次以 `failed` 收尾；滚动与悬停不参与判定。只认画面比对，不靠光标判断焦点，缩采样会抹平闪烁。
17. **脚本是技能的确定性版本**：`skills/<id>/scripts/<脚本 id>.json`，一个技能可以有零到多个；文件名是脚本 id（工具名要用），勾选技能后才逐个注册成 `run_script_<技能 id>_<脚本 id>` 工具，由模型判断时机调用，界面不提供手动运行入口。脚本只有 `click` / `type` / `key` / `wait` / `wait_for_change` 五种动作，坐标是 0~1 归一化值，线性执行、不做分支与循环（判断交给模型）。任一步 `expect` 不符就抛错并写明第几步，按普通工具失败计数；不可逆流程标 `confirm`，确认按调用次数生效。脚本工具不参与 `effect.ts` 的画面变化判定；`run_script_` 前缀在循环层按输入工具对待（压住接管检测、截图前等重绘）。某个脚本文件解析失败只当它不存在，不能影响技能和其它脚本。格式见 `docs/脚本方案.md`。

## 代码风格

- 中文交流、中文注释；注释解释「为什么」，不复述代码。
- 单文件 ≤300 行、函数 ≤30 行、嵌套 ≤3 层。
- 界面统一用 MUI `sx` + `theme.ts` 的 token，不引入 Tailwind、状态库或自研组件库。
- 提交一次只做一件事，沿用 `feat:` / `fix:` / `refactor:` / `docs:` 前缀；未经要求不 push、不 rebase、不 amend。

## 改动落点

- 调模型行为：`prompts/agent.ts`（执行策略）、`prompts/plan.ts` 与 `prompts/verify.ts`（规划、核对）、`loop.ts`（分档与终止条件）、`effect.ts`（动作效果核对）、`control.ts`（失败收敛）。
- 加动作能力：在 `tools/` 新建文件导出 `ToolDef`，再注册到 `tools/index.ts`；坐标用 `snapToGrid`，换算走 `core/screen.ts` 与 `core/input.ts`。
- 长流程与技能：技能系统已接入，新增技能只需在 `skills/<id>/` 下写 `SKILL.md`（frontmatter 只认 `name`、`description`），不必改代码；步数上限在 `src/shared/agent.ts`，三种等待在 `tools/wait*.ts`（引擎 `wait-runner.ts`，画面差分 `agent/watch.ts`），时间线容量在 `useAgentRun.ts`。自动沉淀的提示词与解析在 `src/agent/distill.ts`，写盘走 `src/agent/skills.ts` 的 `saveSkill()`，开关与结果提示在 `TaskBar.tsx`。
- 脚本：格式与校验在 `src/shared/script.ts`，注册成工具与参数处理在 `src/agent/scripts.ts`，逐步执行在 `src/agent/script-runner.ts`；新增一种动作要先在 `tools/` 实现，再加进脚本动作白名单（`SCRIPT_ACTIONS` 与 `stepInput`），不要另写一套坐标换算。
- 改安全底线：四条边界常量在 `src/agent/prompts/agent.ts`；用户自定义约束写进技能手册，不另设规则目录。
- 界面：`src/renderer/src/components/`；主进程与渲染进程之间新增字段先改 `src/shared/`。

## 验收

改完跑 `npm run typecheck` 与 `npm run build`，再通读 diff 检查：暂停是否仍在步骤边界、watcher 是否一定 stop、日志是否脱敏、有无超出文件行数上限。`runs/` 下的运行日志（不入库）是复盘实际行为的依据。
