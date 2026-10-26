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

export type { ToolDef } from './types'
