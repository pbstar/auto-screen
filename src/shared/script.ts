/**
 * 技能附带的脚本：给模型一个「一次调用跑完固定流程」的工具。
 * 这里只管格式与校验；读取、执行分别在 agent/scripts.ts 与 agent/script-runner.ts。
 * 解析失败一律当作这个技能没有脚本，不影响技能本身。
 */

export const SCRIPT_ACTIONS = ['click', 'type', 'key', 'wait', 'wait_for_change'] as const
export type ScriptAction = (typeof SCRIPT_ACTIONS)[number]

export const SCRIPT_EXPECTS = ['change', 'same', 'any'] as const
export type ScriptExpect = (typeof SCRIPT_EXPECTS)[number]

/** 再长的流程该拆成几个脚本或交回 AI 循环，否则出错时没人复盘得清 */
export const MAX_SCRIPT_STEPS = 80
/** 单次执行的总时长上限：脚本卡住时不能一直占着一次运行 */
export const MAX_SCRIPT_MS = 300_000
const MAX_WAIT_MS = 3_600_000
const MAX_STEP_TIMEOUT_MS = 60_000

export interface ScriptParam {
  /** 第一版只支持字符串；数字、选项由模型在调用前想清楚 */
  type: 'string'
  required?: boolean
  description: string
}

export interface ScriptPrecheck {
  /** 窗口标题必须包含的关键字，全部命中才执行 */
  titleContains?: string[]
}

export interface ScriptStep {
  action: ScriptAction
  /** 归一化坐标 0~1，乘截图宽高得到截图坐标：窗口尺寸变了照样成立 */
  point?: [number, number]
  text?: string
  combo?: string
  ms?: number
  timeoutMs?: number
  /** 缺省 any：不校验画面，关键步骤建议写明 */
  expect?: ScriptExpect
  /** 进度上显示的这一步在做什么，缺省用动作名 */
  note?: string
}

export interface ScriptDef {
  name: string
  description: string
  when?: string
  confirm?: boolean
  precheck?: ScriptPrecheck
  params: Record<string, ScriptParam>
  steps: ScriptStep[]
}

/** 一份被勾选技能的脚本，执行前只差参数；scriptId 是文件名，用来拼工具名 */
export interface SkillScript {
  skillId: string
  skillName: string
  scriptId: string
  script: ScriptDef
}

/** 技能目录下 scripts/ 里的一个脚本文件 */
export interface ScriptEntry {
  id: string
  script: ScriptDef
}

/** 界面展示用的脚本摘要，不含步骤 */
export interface ScriptSummary {
  name: string
  steps: number
  params: string[]
}

const PLACEHOLDER = /\{\{\s*([\w-]+)\s*\}\}/g

/**
 * 脚本注册成工具的名字：一个技能可以有多个脚本，所以技能、脚本两级都进名字，
 * 模型才分得清调的是哪个。「run_script_ + 24 + 1 + 20」控制长度，给去重后缀留余量。
 */
export function scriptToolName(skillId: string, scriptId: string): string {
  const skill = slugOf(skillId).slice(0, 24) || 'skill'
  const script = slugOf(scriptId).slice(0, 20) || 'script'
  return `run_script_${skill}_${script}`
}

/** 目录名与文件名都转成工具名可用的 slug；中文目录名会退化成固定词 */
function slugOf(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** 把 {{param}} 换成实参，缺失的按空串处理（required 参数在执行前已经拦过） */
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER, (_, name: string) => values[name] ?? '')
}

export function summarizeScript(script: ScriptDef): ScriptSummary {
  return { name: script.name, steps: script.steps.length, params: Object.keys(script.params) }
}

function fail(message: string): never {
  throw new Error(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textOf(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} 必须是非空字符串`)
  }
  return value.trim().slice(0, max)
}

function optionalText(value: unknown, field: string, max = 2000): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') fail(`${field} 必须是字符串`)
  return value.trim().slice(0, max)
}

/** 缺省时用 fallback，给了就必须是区间内的数：宁可拒绝执行，也不要带着可疑的值去点 */
function numberIn(
  value: unknown,
  field: string,
  min: number,
  max: number,
  options: { integer?: boolean; fallback?: number } = {},
): number {
  if (value === undefined || value === null) {
    if (options.fallback !== undefined) return options.fallback
    fail(`缺少 ${field}`)
  }
  const num = Number(value)
  if (!Number.isFinite(num)) fail(`${field} 必须是数字`)
  const result = options.integer ? Math.round(num) : num
  if (result < min || result > max) fail(`${field} 必须在 ${min}~${max} 之间`)
  return result
}

function pointOf(value: unknown, field: string): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) fail(`${field} 必须是 [x, y] 两个 0~1 的数`)
  const x = Number(value[0])
  const y = Number(value[1])
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) fail(`${field} 的坐标必须在 0~1 之间`)
  return [x, y]
}

function readExpect(value: unknown): ScriptExpect {
  if (value === undefined || value === null) return 'any'
  if (!SCRIPT_EXPECTS.includes(value as ScriptExpect)) {
    fail(`expect 必须是 ${SCRIPT_EXPECTS.join(' / ')}`)
  }
  return value as ScriptExpect
}

function readStep(raw: unknown, index: number): ScriptStep {
  const label = `steps[${index}]`
  if (!isRecord(raw)) fail(`${label} 必须是对象`)
  if (!SCRIPT_ACTIONS.includes(raw.action as ScriptAction)) {
    fail(`${label}.action 必须是 ${SCRIPT_ACTIONS.join(' / ')}`)
  }
  const step: ScriptStep = { action: raw.action as ScriptAction, expect: readExpect(raw.expect) }
  const note = optionalText(raw.note, `${label}.note`, 80)
  if (note) step.note = note
  if (step.action === 'click') step.point = pointOf(raw.point, `${label}.point`)
  if (step.action === 'type') step.text = textOf(raw.text, `${label}.text`, 10_000)
  if (step.action === 'key') step.combo = textOf(raw.combo, `${label}.combo`, 100)
  if (step.action === 'wait') {
    step.ms = numberIn(raw.ms, `${label}.ms`, 0, MAX_WAIT_MS, { integer: true })
  }
  if (raw.timeoutMs !== undefined && raw.timeoutMs !== null) {
    step.timeoutMs = numberIn(raw.timeoutMs, `${label}.timeoutMs`, 100, MAX_STEP_TIMEOUT_MS, {
      integer: true,
    })
  }
  return step
}

function readSteps(value: unknown): ScriptStep[] {
  if (!Array.isArray(value) || value.length === 0) fail('steps 必须是至少一步的数组')
  if (value.length > MAX_SCRIPT_STEPS) fail(`steps 最多 ${MAX_SCRIPT_STEPS} 步`)
  return value.map((raw, index) => readStep(raw, index))
}

function readParams(value: unknown): Record<string, ScriptParam> {
  if (value === undefined || value === null) return {}
  if (!isRecord(value)) fail('params 必须是对象')
  const params: Record<string, ScriptParam> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (!isRecord(raw)) fail(`params.${key} 必须是对象`)
    if (raw.type !== undefined && raw.type !== 'string') fail(`params.${key}.type 只支持 string`)
    params[key] = {
      type: 'string',
      required: raw.required === true,
      description: optionalText(raw.description, `params.${key}.description`, 100) ?? key,
    }
  }
  return params
}

function readPrecheck(value: unknown): ScriptPrecheck | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) fail('precheck 必须是对象')
  const raw = value.titleContains
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw) || raw.length === 0) fail('precheck.titleContains 必须是非空数组')
  return {
    titleContains: raw.map((item, index) =>
      textOf(item, `precheck.titleContains[${index}]`, 100),
    ),
  }
}

/** 占位符必须都能在 params 里找到，否则跑到一半才发现参数名写错 */
function assertPlaceholders(script: ScriptDef): void {
  for (const step of script.steps) {
    for (const match of (step.text ?? '').matchAll(PLACEHOLDER)) {
      if (!script.params[match[1]]) fail(`steps 里引用了未定义的参数 {{${match[1]}}}`)
    }
  }
}

export function parseScript(raw: unknown): ScriptDef {
  if (!isRecord(raw)) fail('脚本必须是 JSON 对象')
  const script: ScriptDef = {
    name: textOf(raw.name, 'name'),
    description: optionalText(raw.description, 'description', 500) ?? '',
    when: optionalText(raw.when, 'when', 500),
    confirm: raw.confirm === true,
    precheck: readPrecheck(raw.precheck),
    params: readParams(raw.params),
    steps: readSteps(raw.steps),
  }
  assertPlaceholders(script)
  return script
}
