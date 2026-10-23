# 工具系统（Tools）

Agent 的动作能力统一在这里定义和实现。点击、拖拽、滚动、输入都走同一条执行路径，不重复实现。

## 目录

```
electron/agent/
├─ registry.ts          # executeTool(name, input, context)
│                       # listToolSchemas() → OpenAI function 格式
│                       # listToolSummaries() → 界面工具列表
└─ tools/
   ├─ types.ts          # ToolDef / ToolResult 类型
   ├─ helpers.ts        # 参数读取与范围裁剪
   ├─ index.ts          # 工具清单，新增工具在这里注册
   ├─ click.ts
   ├─ drag.ts
   ├─ scroll.ts
   ├─ type.ts
   ├─ key.ts
   ├─ wait.ts
   ├─ move.ts
   └─ list-windows.ts
```

## 调用链

```
Agent 循环（electron/agent/loop.ts）
        │ executeTool(name, input, context)
        ▼
electron/agent/registry.ts
        │ 查表并调用
        ▼
tools/*.ts  →  src/core/input.ts / screen.ts
```

`hideWindow` 默认开启：动作前隐藏本窗口约 250ms，结束后恢复，避免鼠标落回自己身上。`wait` / `list_windows` 这类不产生鼠标键盘动作的工具不需要隐藏。

注意：`executeTool()` 本身不处理窗口显隐，这是调用方的责任，`agent/loop.ts` 用 `withWindowHidden` 包住了需要隐藏的动作。

## ToolContext

```ts
interface ToolContext {
  windowId: number
  imageWidth: number   // 当前截图宽，界面与模型共用的坐标系
  imageHeight: number
  unitMode?: 'auto' | 'physical' | 'logical'
}
```

坐标一律使用**截图坐标系**：左上角为 `(0, 0)`，按 10px 网格取整。工具内部通过 `imageToPhysical()` 换算成屏幕物理像素，再交给 nut.js；工具本身不处理 Retina、DPI 和窗口偏移。

## ToolDef

```ts
interface ToolDef {
  name: string
  description: string                  // 给模型看：什么时候用、坐标含义
  parameters: Record<string, unknown>  // JSON Schema，用于 function calling
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
}
```

返回结构：

```ts
interface ToolResult {
  text: string        // 必填，回填给模型并显示在时间线
  data?: unknown      // 结构化结果，可选
  image?: string      // PNG data URL，留给截图类工具
  isError?: boolean
}
```

## 现有工具

| name | 参数 | 说明 |
|---|---|---|
| `click` | `x, y, button?, count?` | 单击 / 双击 / 右键，`count` 取值 1~2 |
| `drag` | `fromX, fromY, toX, toY` | 按住左键从起点拖到终点 |
| `scroll` | `x, y, direction, amount?` | 在指定位置上下滚动，`amount` 1~10，默认 3 |
| `move` | `x, y` | 只移动不点击，用于悬停展开菜单 |
| `type` | `text` | 输入文本到当前焦点，执行前先 `click` 聚焦 |
| `key` | `combo` | 组合键，`mod` 在 macOS 为 Cmd、Windows 为 Ctrl |
| `wait` | `ms` | 等待 0~5000ms |
| `list_windows` | — | 列出可操作窗口，不需要坐标 |

参数校验在 `helpers.ts`：缺失或非法数字直接抛错，坐标对齐到 10px 并裁剪到截图范围内，`count` / `amount` 裁剪到规定范围，未知枚举值直接报错；未知工具名由 registry 报错。

## 新增一个工具

1. 在 `tools/` 下新建文件，导出一个 `ToolDef`：

```ts
import type { ToolDef } from './types'
import { requireNumber } from './helpers'

export const moveTool: ToolDef = {
  name: 'move',
  description: '把鼠标移动到截图坐标 (x, y)。',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
    },
    required: ['x', 'y'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const x = requireNumber(input, 'x')
    const y = requireNumber(input, 'y')
    // 用 context 换算坐标并执行动作
    return { text: `已移动到 (${x}, ${y})` }
  },
}
```

2. 在 `tools/index.ts` 的 `tools` 数组里加一项。
3. 不需要改别处：`listToolSchemas()` 会自动带进模型定义，`listToolSummaries()` 会自动带进界面上的工具列表。

## 在 Agent 循环中调用

`listToolSchemas()` 返回的数组直接作为 DeepSeek 的 `tools` 参数。模型返回 `tool_calls` 后，把工具名、`arguments` 和当前 `ToolContext` 交给 `executeTool()` 即可，窗口显隐由 `loop.ts` 统一包在 `withWindowHidden` 里。

## 约定

- 一个工具一个文件，参数用 JSON Schema 描述完整（`required` + `additionalProperties: false`）。
- `description` 是写给模型看的，写清适用场景和坐标规则。
- 工具只负责动作，不处理窗口显隐、截图和 IPC；这些由上层统一做。
- 坐标输出保持 10px 的倍数，换算成物理像素的工作只在工具内部发生。
- 日志、时间线、失败重试由调用方统一处理，工具只返回结果或抛错。
