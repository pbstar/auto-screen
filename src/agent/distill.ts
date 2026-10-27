import type { TokenUsage } from '../shared/agent'
import type { SkillSummary } from '../shared/types'
import { listWindows } from '../core/screen'
import { parseFrontmatter } from './frontmatter'
import { completeText, describeError, type AgentMessage } from './llm'
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

const SYSTEM_PROMPT = [
  '你在整理桌面操作手册。用户刚完成一次桌面任务，你要把过程沉淀成一份技能手册，供下次同类任务照着做。',
  '',
  '只输出 SKILL.md 的完整内容，不要任何解释，也不要用代码围栏：',
  '第一行是 ---，接着是 name 与 description 两行，再一行 ---，然后是正文。',
  '',
  '要求：',
  '- name 用中文，简短说明这是一件什么事；description 一句话写清适用场景。',
  '- 正文分「## 适用场景」「## 操作步骤」「## 注意」三节；步骤按这次实际发生的顺序编号，写清每步的目标元素与动作。',
  '- 位置用界面元素名称或相对位置（例如「顶部工具栏右侧的搜索框」），不要写像素坐标。',
  '- 每一步都要求先用新截图核对结果再继续。',
  '- 只写这次实际做过并验证有效的步骤，不要写推测。',
  '- 如果这次任务没有可复用的流程（动作过少、纯一次性），只输出 SKIP。',
].join('\n')

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
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `任务：${input.task}`,
        `目标窗口：${windowLabel(input.windowId)}`,
        '',
        '执行轨迹（每行一步）：',
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

function parseSkill(text: string): { name: string; description: string; body: string } | null {
  const content = stripWrapper(text)
  if (!content) return null
  const { meta, body } = parseFrontmatter(content)
  const name = meta.name?.trim()
  const trimmed = body.trim().slice(0, MAX_BODY)
  if (!name || !trimmed) return null
  return { name, description: meta.description?.trim() ?? '', body: trimmed }
}

/**
 * 把一次完成的运行整理成技能并落盘。
 * 任何问题都收敛成 status，绝不向调用方抛错：沉淀失败不能改写任务结果。
 */
export async function distillSkill(input: DistillInput): Promise<DistillResult> {
  try {
    const reply = await completeText(buildMessages(input), input.signal)
    const parsed = parseSkill(reply.content)
    if (!parsed) return { status: 'skipped', usage: reply.usage }
    return { status: 'saved', skill: saveSkill(parsed), usage: reply.usage }
  } catch (caught) {
    return { status: 'failed', error: describeError(caught) }
  }
}
