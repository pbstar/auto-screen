# 工具系统（Tools）

界面和后续 Agent 共用同一套动作工具。点击、拖拽、滚动、输入都从这里走，不在 UI 和模型侧各实现一遍。

## 目录

```
electron/agent/
├─ registry.ts          # executeTool(name, input, context)
│                       # listToolSchemas() → OpenAI function 格式
└─ tools/
   ├─ types.ts          # ToolDef / ToolResult 类型
   ├─ helpers.ts        # 参数读取与范围裁剪
   ├─ index.ts          # 工具清单，新增工具在这里注册
   ├─ click.ts
   ├─ drag.ts
   ├─ scroll.ts
   ├─ type.ts
   ├─ key.ts
   └─ wait.ts
```

## 调用链

```
界面按钮 / Agent 循环
        │ executeTool(name, input, context)
        ▼
electron/ipc.ts   tools:execute
        │ withWindowHidden(...)
        ▼
electron/agent/registry.ts
        │ 查表并调用
        ▼
tools/*.ts  →  src/core/input.ts / screen.ts
```

`hideWindow` 默认开启：动作前隐藏本窗口约 250ms，结束后恢复，避免鼠标落回自己身上。`wait` 这类不产生鼠标键盘动作的工具可以传 `false`。

注意：`executeTool()` 本身不处理窗口显隐，这是调用方的责任。IPC 通道已经包好了 `withWindowHidden`；M2 的 Agent 循环直接调用 `executeTool()` 时，也要自己包一层。

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
  text: string        // 必填，界面状态栏和模型都会读
  data?: unknown      // 结构化结果，可选
  image?: string      // PNG data URL，留给截图类工具
  isError?: boolean
}
```

## 现有工具

| name | 参数 | 界面暴露 | 说明 |
|---|---|---|---|
| `click` | `x, y, button?, count?` | 是 | 单击 / 双击 / 右键，`count` 取值 1~2 |
| `drag` | `fromX, fromY, toX, toY` | 是 | 按住左键从起点拖到终点 |
| `scroll` | `x, y, direction, amount?` | 是 | 在指定位置上下滚动，`amount` 1~10，默认 3 |
| `type` | `text` | 否 | 剪贴板粘贴，中文安全；执行前应先 `click` 聚焦 |
| `key` | `combo` | 否 | 组合键，`mod` 在 macOS 为 Cmd、Windows 为 Ctrl |
| `wait` | `ms` | 否 | 等待 0~5000ms |

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
3. 界面要暴露就加按钮，调用 `window.autoScreen.executeTool`；不暴露的工具模型仍然可以调用。
4. M2 不需要额外改动：`listToolSchemas()` 会自动带上新工具。

## 从界面调用

```ts
const result = await window.autoScreen.executeTool({
  name: 'click',
  input: { x: 120, y: 340, button: 'left', count: 1 },
  context: {
    windowId: capture.window.id,
    imageWidth: capture.width,
    imageHeight: capture.height,
    unitMode: 'auto',
  },
  hideWindow: true,
})

if (result.ok) {
  console.log(result.data.text)
}
```

## 后续接模型

`listToolSchemas()` 返回的数组可以直接作为 DeepSeek 的 `tools` 参数。模型返回 `tool_calls` 时，把工具名、`arguments` 和当前 `ToolContext` 交给 `executeTool()` 即可。工具层不关心调用方是界面还是模型。

```ts
import { withWindowHidden } from '../../src/core/safety'

const tools = listToolSchemas()

// 模型返回 tool_calls 后
const result = await withWindowHidden(mainWindow, true, () =>
  executeTool(call.function.name, JSON.parse(call.function.arguments), context),
)
```

## 约定

- 一个工具一个文件，参数用 JSON Schema 描述完整（`required` + `additionalProperties: false`）。
- `description` 是写给模型看的，写清适用场景和坐标规则。
- 工具只负责动作，不处理窗口显隐、截图和 IPC；这些由上层统一做。
- 坐标输出保持 10px 的倍数，换算成物理像素的工作只在工具内部发生。
- 日志、时间线、失败重试由调用方统一处理，工具只返回结果或抛错。
