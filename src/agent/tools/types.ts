import type { ToolContext, ToolResult } from '../../shared/types'

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult>
}
