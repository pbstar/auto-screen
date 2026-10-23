import type { ToolDef } from './types'
import { clickTool } from './click'
import { dragTool } from './drag'
import { scrollTool } from './scroll'
import { typeTool } from './type'
import { keyTool } from './key'
import { waitTool } from './wait'

export const tools: ToolDef[] = [
  clickTool,
  dragTool,
  scrollTool,
  typeTool,
  keyTool,
  waitTool,
]

export type { ToolDef } from './types'
