# Auto Screen

可视化桌面操作 Agent。当前进度：**M2 Agent 闭环**。

设计方案见 [docs/技术方案.md](docs/技术方案.md)。

## 开发

```bash
npm install
npm run dev
```

## 静态检查

```bash
npm run typecheck
npm run build
```

## 系统权限

- macOS：需要「屏幕录制」和「辅助功能」权限，授权后重启应用。
- Windows：目标窗口以管理员权限运行时，本应用也需要以管理员身份启动。

## 配置

```bash
cp .env.example .env
```

```dotenv
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_REASONING_EFFORT=low
```

`.env` 不进仓库；没填 Key 时界面会提示，且不会启动 Agent。改完 `.env` 需要重启应用生效。

## 当前功能（M2）

- 顶栏下拉选择目标窗口，按窗口截屏
- 预览区显示 10px 刻度标尺、100px 虚线网格，悬停读坐标，不响应点击
- 输入一句任务，Agent 循环「截图 → 模型决策 → 执行工具 → 再截图」，最多 30 步，可随时停止
- 右侧面板：任务输入、执行时间线（每步截图、模型回复与工具调用）、底部可折叠的工具与技能列表
- 发给模型的截图叠加同样的标尺与网格，长边缩放到 1280

## 工具

Agent 的动作能力来自 `electron/agent/registry.ts` 的工具注册表：

- `click` / `drag` / `scroll` / `move`：鼠标动作
- `type` / `key`：文本输入与组合键
- `wait` / `list_windows`：等待与窗口查询

模型侧使用 `listToolSchemas()` 生成的 function 定义，统一通过 `executeTool(name, input, context)` 执行；界面上的工具列表来自 `listToolSummaries()`，只读展示。详细说明见 [electron/agent/tools/README.md](electron/agent/tools/README.md)。

## 尚未实现

- M3：技能系统（技能加载、勾选、注入提示词）
- M4：双平台打包、权限引导、全局停止热键与前台窗口校验
