import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fillPlaceholders,
  parseScript,
  scriptToolName,
  type ScriptDef,
  type ScriptStep,
  type SkillScript,
} from '../shared/script'
import type { ToolContext, ToolResult } from '../shared/types'
import { findWindow } from '../core/screen'
import { runScriptSteps } from './script-runner'
import type { ToolDef } from './tools/types'

const SCRIPT_FILE = 'script.json'
export const SCRIPT_TOOL_PREFIX = 'run_script_'

export function isScriptTool(name: string): boolean {
  return name.startsWith(SCRIPT_TOOL_PREFIX)
}

/** 读技能目录下的 script.json；不存在、读不动或格式不对都按「没有脚本」处理 */
export function loadScript(dir: string): ScriptDef | null {
  const path = join(dir, SCRIPT_FILE)
  if (!existsSync(path)) return null
  try {
    return parseScript(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return null
  }
}

/** 把勾选技能的脚本注册成工具：测不准的脚本宁可拒绝注册，也不要在错误页面点下去 */
export function scriptTools(scripts: SkillScript[]): ToolDef[] {
  const taken = new Set<string>()
  return scripts.map((entry) => buildTool(entry, uniqueName(entry.skillId, taken)))
}

function uniqueName(skillId: string, taken: Set<string>): string {
  const base = scriptToolName(skillId)
  let name = base
  for (let n = 2; taken.has(name); n += 1) name = `${base}-${n}`
  taken.add(name)
  return name
}

function buildTool(entry: SkillScript, name: string): ToolDef {
  // 确认框要写明「第几次调用」：计数挂在工具实例上，一次运行自然从 1 开始
  let calls = 0
  return {
    name,
    description: describeOf(entry.script),
    parameters: schemaOf(entry.script),
    async execute(input, context) {
      calls += 1
      return runScript(entry, input, context, calls)
    },
  }
}

function describeOf(script: ScriptDef): string {
  const lines = [
    `执行脚本《${script.name}》：${script.description || '已经固化的操作序列'}。`,
    `一次调用跑完整条序列（共 ${script.steps.length} 步），不再逐步询问你；` +
      '任何一步与预期不符会立即停止，并说明停在第几步。',
  ]
  if (script.when) lines.push(`适用条件：${script.when}`)
  if (script.confirm) lines.push('执行前会请用户确认参数，用户取消则不执行。')
  return lines.join('\n')
}

function schemaOf(script: ScriptDef) {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const [key, param] of Object.entries(script.params)) {
    properties[key] = { type: 'string', description: param.description }
    if (param.required) required.push(key)
  }
  return { type: 'object', properties, required, additionalProperties: false }
}

async function runScript(
  entry: SkillScript,
  input: Record<string, unknown>,
  context: ToolContext,
  call: number,
): Promise<ToolResult> {
  const { script } = entry
  checkPrecheck(entry, context)
  const steps = specialize(script, input)
  if (!(await confirm(script, input, context, call))) {
    return { text: `脚本《${script.name}》按用户要求取消，没有执行任何动作` }
  }
  await runScriptSteps(steps, context)
  const confirmed = script.confirm ? '（执行前已确认）' : ''
  return { text: `脚本《${script.name}》执行完成，共 ${steps.length} 步${confirmed}` }
}

/** 页面不对时一个动作都不做：标题是低成本的粗筛，细的区别交给首步 expect */
function checkPrecheck(entry: SkillScript, context: ToolContext): void {
  const keywords = entry.script.precheck?.titleContains
  if (!keywords || keywords.length === 0) return
  const title = findWindow(context.windowId).title()
  const missing = keywords.filter((word) => !title.includes(word))
  if (missing.length === 0) return
  throw new Error(
    `当前窗口标题「${title}」不含「${missing.join('、')}」，` +
      `脚本《${entry.script.name}》没有执行任何动作，请先回到对应页面`,
  )
}

/** 参数先整体校验再替换：缺一个必填参数就不要跑一半才报错 */
function specialize(script: ScriptDef, input: Record<string, unknown>): ScriptStep[] {
  const values: Record<string, string> = {}
  for (const [key, param] of Object.entries(script.params)) {
    const raw = input[key]
    const value = raw === undefined || raw === null ? '' : String(raw).trim()
    if (param.required && value.length === 0) {
      throw new Error(`脚本《${script.name}》缺少必填参数 ${key}（${param.description}）`)
    }
    values[key] = value
  }
  return script.steps.map((step) => ({
    ...step,
    ...(step.text === undefined ? {} : { text: fillPlaceholders(step.text, values) }),
  }))
}

/** 确认按调用次数生效：批量发送正是最需要逐项核对的场景 */
async function confirm(
  script: ScriptDef,
  input: Record<string, unknown>,
  context: ToolContext,
  call: number,
): Promise<boolean> {
  if (!script.confirm || !context.ask) return true
  const answer = await context.ask({
    question: confirmQuestion(script, input, call),
    options: [{ label: '确认执行' }, { label: '取消' }],
    multiple: false,
  })
  // 跳过、取消、或回答里没有「确认」一律不执行：不可逆流程宁可不做
  return answer !== null && answer.includes('确认')
}

function confirmQuestion(
  script: ScriptDef,
  input: Record<string, unknown>,
  call: number,
): string {
  const values = Object.entries(script.params).map(
    ([key, param]) => `· ${param.description}：${String(input[key] ?? '（空）')}`,
  )
  return [
    `脚本《${script.name}》第 ${call} 次调用，共 ${script.steps.length} 步，即将执行。`,
    ...values,
    '确认执行？',
  ].join('\n')
}
