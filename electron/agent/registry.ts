import type { ToolContext, ToolResult } from '../../src/shared/types'
import { tools, type ToolDef } from './tools'

const registry = new Map<string, ToolDef>(tools.map((tool) => [tool.name, tool]))

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = registry.get(name)
  if (!tool) {
    throw new Error(`未知工具：${name}`)
  }
  return tool.execute(input, context)
}

/** OpenAI function 格式的工具定义，M2 的 Agent 循环直接使用 */
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
