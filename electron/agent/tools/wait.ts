import type { ToolDef } from './types'
import { requireNumber } from './helpers'

/** 操作手册里会有「等 5 分钟再继续」这类固定停顿，上限给到 5 分钟 */
const MAX_WAIT_MS = 300_000

/** 等待期间用户可能点终止，靠 abort 立即退出，不阻塞停止 */
function sleepOrAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    let timer: ReturnType<typeof setTimeout>
    const finish = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}

export const waitTool: ToolDef = {
  name: 'wait',
  description: `等待一段时间，让界面完成响应或按操作手册做固定停顿。单位毫秒，最多 ${MAX_WAIT_MS}。`,
  parameters: {
    type: 'object',
    properties: {
      ms: { type: 'integer', minimum: 0, maximum: MAX_WAIT_MS, description: '等待毫秒数' },
    },
    required: ['ms'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const ms = requireNumber(input, 'ms', { min: 0, max: MAX_WAIT_MS, integer: true })
    await sleepOrAbort(ms, context.signal)
    return { text: `已等待 ${ms}ms` }
  },
}
