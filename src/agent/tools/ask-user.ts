import type { AskOption } from '../../shared/agent'
import type { AskInput } from '../../shared/types'
import { requireString } from './helpers'
import type { ToolDef } from './types'

const MAX_OPTIONS = 4

/** 模型偶尔把选项写成字符串数组，这里统一成 {label} 的结构 */
function readOptions(raw: unknown): AskOption[] {
  if (!Array.isArray(raw)) return []
  const options: AskOption[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      if (item.trim()) options.push({ label: item.trim() })
    } else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const description =
        typeof record.description === 'string' ? record.description.trim() : ''
      if (label) options.push(description ? { label, description } : { label })
    }
    if (options.length >= MAX_OPTIONS) break
  }
  return options
}

function readInput(input: Record<string, unknown>): AskInput {
  return {
    question: requireString(input, 'question').trim().slice(0, 300),
    options: readOptions(input.options),
    multiple: input.multiple === true,
  }
}

export const askUserTool: ToolDef = {
  name: 'ask_user',
  description:
    '向用户提一个问题并等待回答。任务目标有歧义、需要用户做选择、或马上要做不可撤销的操作时使用；' +
    '一次只问一个问题，给出 2~4 个具体选项，用户也可以自己补充文字或跳过；' +
    '信息足够时不要用提问代替自己的判断。',
  parameters: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: '要问用户的问题，一句话说清',
      },
      options: {
        type: 'array',
        description: '可选项，2~4 个；不给就只让用户自由回答',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: '选项文字，尽量短' },
            description: { type: 'string', description: '一句话解释这个选项' },
          },
          required: ['label'],
          additionalProperties: false,
        },
      },
      multiple: {
        type: 'boolean',
        description: '是否允许多选，默认否',
      },
    },
    required: ['question'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const request = readInput(input)
    if (!context.ask) throw new Error('当前运行不支持向用户提问')
    const answer = await context.ask(request)
    if (answer === null) {
      return { text: '用户跳过了这个问题，请自行判断或结束任务。' }
    }
    return { text: `用户回答：${answer}` }
  },
}
