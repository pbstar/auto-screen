import type { TokenUsage } from '../shared/agent'
import { chat } from './llm'
import { VERIFY_PROMPT } from './prompts/verify'

export interface VerifyInput {
  task: string
  plan: string | null
  /** 模型宣布完成时的结论，核对时用来判断画面是否支持它 */
  claim: string | null
  /** 模型宣布完成时看到的那张标注截图 */
  image: string
  signal: AbortSignal
}

export interface Verdict {
  ok: boolean
  problem: string
}

export interface VerifyResult {
  /** 解析不出结论时为 null，调用方按通过处理，不让格式问题卡住任务 */
  verdict: Verdict | null
  usage: TokenUsage
}

/**
 * 最终核对：一次不带工具的高思考调用，只看任务要求和结束时的画面。
 * 模型自己宣布完成不算数，必须由这里裁决。
 */
export async function verifyResult(input: VerifyInput): Promise<VerifyResult> {
  const reply = await chat({
    messages: [
      { role: 'system', content: VERIFY_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `任务：${input.task}`,
              input.plan ? `既定流程：\n${input.plan}` : '既定流程：（没有生成）',
              `模型的结论：${input.claim ?? '（没有给出说明）'}`,
              '任务结束时的画面见截图，请核对。',
            ].join('\n'),
          },
          { type: 'image_url', image_url: { url: input.image, detail: 'high' } },
        ],
      },
    ],
    signal: input.signal,
    maxTokens: 512,
    effort: 'high',
  })
  return { verdict: parseVerdict(reply.content ?? ''), usage: reply.usage }
}

/** 模型偶尔会包一层说明，取第一个 { 到最后一个 } 之间的 JSON */
function parseVerdict(text: string): Verdict | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1))
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>
    if (typeof record.ok !== 'boolean') return null
    const problem = typeof record.problem === 'string' ? record.problem.trim().slice(0, 300) : ''
    return { ok: record.ok, problem }
  } catch {
    return null
  }
}
