import type { ToolContext, ToolResult, ToolSummary } from '../../../src/shared/types'
import type { ToolDef } from './types'
import { clickTool } from './click'
import { dragTool } from './drag'
import { scrollTool } from './scroll'
import { typeTool } from './type'
import { keyTool } from './key'
import { waitTool } from './wait'
import { waitUntilTool } from './wait-until'
import { waitForChangeTool } from './wait-change'
import { moveTool } from './move'
import { listWindowsTool } from './list-windows'

export const tools: ToolDef[] = [
  clickTool,
  dragTool,
  scrollTool,
  typeTool,
  keyTool,
  waitTool,
  waitUntilTool,
  waitForChangeTool,
  moveTool,
  listWindowsTool,
]

const registry = new Map<string, ToolDef>(tools.map((tool) => [tool.name, tool]))

/** 模型给出工具名后统一从这里执行，未知工具一律报错回传 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = registry.get(name)
  if (!tool) throw new Error(`未知工具：${name}`)
  return tool.execute(input, context)
}

/** OpenAI function 格式的工具定义，模型请求直接使用 */
export function listToolSchemas() {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

/** 界面展示用，不带 JSON Schema，避免把完整定义送到渲染进程 */
export function listToolSummaries(): ToolSummary[] {
  return tools.map(({ name, description }) => ({ name, description }))
}

export type { ToolDef } from './types'
