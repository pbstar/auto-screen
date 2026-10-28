import type { FrameSignature } from '../shared/types'
import { framesDiffer } from './watch'

/** 连续无变化到第几次开始要求换方式、第几次建议提问、第几次直接终止 */
const HINT_AT = 2
const ASK_AT = 4
const GIVE_UP_AT = 6
/** 这些动作理应改变画面，没变就是没生效；滚动、悬停可能本来就看不到变化，不参与判定 */
const EFFECT_TOOLS = new Set(['click', 'type', 'key', 'drag'])
/** 焦点导航键本来就可能不动画面（比如 tab 切焦点），判定没有意义 */
const SILENT_KEYS = new Set(['tab', 'esc', 'escape', 'up', 'down', 'left', 'right', 'home', 'end'])

/** 这个动作执行后应该看到画面变化吗；不看效果的动作不必进连续无变化的计数 */
export function countsAsEffect(name: string, input: Record<string, unknown>): boolean {
  if (!EFFECT_TOOLS.has(name)) return false
  if (name !== 'key') return true
  // 只看最后一个键，shift+tab 也算导航
  const key = String(input.combo ?? '').toLowerCase().split('+').pop() ?? ''
  return !SILENT_KEYS.has(key.trim())
}

export interface EffectResult {
  /** 需要写进下一步截图说明的观察，null 表示动作正常或无从判断 */
  note: string | null
  /** 连续没有引起画面变化的输入动作次数 */
  streak: number
  /** 是否把下一步提升到高思考强度 */
  escalate: boolean
  /** 连续无变化达到上限时的终止原因，null 表示可以继续 */
  abort: string | null
}

/**
 * 判断上一步动作有没有真的改变画面。只给「变没变」这个事实，不猜原因：
 * 模型最容易把「画面没变」解释成没获得焦点，然后换个坐标原地重试几十步。
 */
export function judgeEffect(
  before: FrameSignature | null,
  after: FrameSignature,
  action: string | null,
  streak: number,
): EffectResult {
  if (!before) return { note: null, streak, escalate: false, abort: null }
  // 画面变了就清零，哪怕上一步是等待之类不可判定的动作
  if (framesDiffer(before, after)) return { note: null, streak: 0, escalate: false, abort: null }
  if (!action) return { note: null, streak, escalate: false, abort: null }

  const next = streak + 1
  if (next >= GIVE_UP_AT) {
    return {
      note: null,
      streak: next,
      escalate: false,
      abort: `连续 ${next} 次动作都没有引起画面变化（最后一次是 ${action}），目标窗口没有响应，已终止`,
    }
  }
  return { note: noteOf(action, next), streak: next, escalate: next >= HINT_AT, abort: null }
}

function noteOf(action: string, streak: number): string {
  const head =
    `注意：上一步 ${action} 之后画面没有任何变化` +
    '（本机逐像素比对的结果，不是猜测），这个动作可能没有生效，不要原样重复。'
  if (streak < HINT_AT) return head

  const advice = '换一种方式：用 tab 键切换焦点、点击目标上不同的位置，或先点别处再点回来。'
  if (streak < ASK_AT) return `${head}已连续 ${streak} 次动作没有引起任何画面变化，${advice}`
  return (
    `${head}已经连续 ${streak} 次动作没有引起任何画面变化，${advice}` +
    '仍然不行就直接用 ask_user 请用户接管并说明情况。'
  )
}
