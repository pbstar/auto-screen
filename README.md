# Auto Screen

可视化桌面操作 Agent。当前进度：**M1 手动操作台**。

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

## 当前功能（M1）

- 枚举并选择目标窗口，按窗口截屏
- 预览区显示 10px 刻度标尺、100px 虚线网格，坐标按 10px 取整
- 点击预览取点（坐标复制到剪贴板），按住拖动框选拖拽范围
- 单击 / 双击 / 右键、拖拽、在取点位置向上/向下滚动

## 工具

界面和后续 Agent 共用同一套工具注册表（`electron/agent/registry.ts`）：

- `click` / `drag` / `scroll`：M1 界面已暴露
- `type` / `key` / `wait`：已注册，供 M2 的模型调用，界面暂不展示

所有动作统一通过 `executeTool(name, input, context)` 执行，后期接大模型时直接复用 `listToolSchemas()` 生成的工具定义。详细说明见 [electron/agent/tools/README.md](electron/agent/tools/README.md)。

## 尚未实现

- M2：视觉模型 Agent 循环与工具注册表
- M3：技能系统与执行时间线
- M4：双平台打包与权限引导
