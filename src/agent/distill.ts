import type { TokenUsage } from '../shared/agent'
import type { SkillSummary } from '../shared/types'
import { listWindows } from '../core/screen'
import { parseFrontmatter } from './frontmatter'
import { chat, describeError, type AgentMessage } from './llm'
import { DISTILL_PROMPT } from './prompts/distill'
import { saveSkill } from './skills'

/** 轨迹与正文都截断：一次沉淀不该让请求体无限变大 */
const MAX_TRACE = 12_000
const MAX_BODY = 4_000

export interface DistillInput {
  task: string
  windowId: number
  /** 每步一行：工具、参数与结果 */
  trace: string[]
  signal: AbortSignal
}

export type DistillResult =
  | { status: 'saved'; skill: SkillSummary; usage: TokenUsage }
  | { status: 'skipped'; usage: TokenUsage }
  | { status: 'failed'; error: string }

function windowLabel(windowId: number): string {
  const win = listWindows(process.pid).find((item) => item.id === windowId)
  // 窗口可能已经关掉；标题只是给模型的上下文，拿不到就让它从任务本身推断
  return win ? `${win.appName} · ${win.title}`.trim() : '（窗口已关闭）'
}

function traceText(lines: string[]): string {
  const text = lines.join('\n')
  if (text.length <= MAX_TRACE) return text
  const tail = MAX_TRACE - 8_000 - 20
  return `${text.slice(0, 8_000)}\n……（中间过程省略）……\n${text.slice(-tail)}`
}

function buildMessages(input: DistillInput): AgentMessage[] {
  return [
    { role: 'system', content: DISTILL_PROMPT },
    {
      role: 'user',
      content: [
        `任务：${input.task}`,
        `目标窗口：${windowLabel(input.windowId)}`,
        '',
        '执行轨迹（每步一行，含当时对界面的判断）：',
        traceText(input.trace),
      ].join('\n'),
    },
  ]
}

/** 模型可能包一层代码围栏或前置说明，统一从第一个 --- 之后开始读 */
function stripWrapper(text: string): string {
  const fenced = /```(?:markdown|md)?\s*\n([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('---')
  return start >= 0 ? body.slice(start).trim() : ''
}

function parseSkill(
  text: string,
): { id: string | null; name: string; description: string; body: string } | null {
  const content = stripWrapper(text)
  if (!content) return null
  const { meta, body } = parseFrontmatter(content)
  const name = meta.name?.trim()
  const trimmed = body.trim().slice(0, MAX_BODY)
  if (!name || !trimmed) return null
  return {
    id: meta.id?.trim() ?? null,
    name,
    description: meta.description?.trim() ?? '',
    body: trimmed,
  }
}

/**
 * 把一次完成的运行整理成技能并落盘。
 * 任何问题都收敛成 status，绝不向调用方抛错：沉淀失败不能改写任务结果。
 */
export async function distillSkill(input: DistillInput): Promise<DistillResult> {
  try {
    const reply = await chat({
      messages: buildMessages(input),
      signal: input.signal,
      maxTokens: 2048,
    })
    const parsed = parseSkill(reply.content ?? '')
    if (!parsed) return { status: 'skipped', usage: reply.usage }
    return { status: 'saved', skill: saveSkill(parsed), usage: reply.usage }
  } catch (caught) {
    return { status: 'failed', error: describeError(caught) }
  }
}
