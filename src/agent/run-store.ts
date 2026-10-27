import { app } from 'electron'
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import type { RunLog, RunMeta } from '../shared/types'

const LOG_NAME = 'run.log'
const META_NAME = 'meta.json'
const MAX_RUNS = 50

let active: { runId: string; dir: string } | null = null

/** 开发时放项目根目录，打包后放 userData；runs/ 在 .gitignore 里 */
export function runsRoot(): string {
  return app.isPackaged
    ? join(app.getPath('userData'), 'runs')
    : join(process.cwd(), 'runs')
}

/** 还没跑过任务时目录不存在，打开目录前先建出来 */
export function ensureRunsRoot(): void {
  mkdirSync(runsRoot(), { recursive: true })
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0')
}

function stamp(date = new Date()): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${day}-${time}`
}

function clock(date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

/** 日志会被人类和模型输出填满，任何 sk- 形式的串都不该原样落盘 */
function redact(text: string): string {
  return text.replace(/sk-[A-Za-z0-9_-]{6,}/g, 'sk-***')
}

function writeMeta(dir: string, meta: RunMeta): void {
  writeFileSync(join(dir, META_NAME), JSON.stringify(meta, null, 2), 'utf8')
}

function dirOf(runId: string): string | null {
  if (active?.runId === runId) return active.dir
  return null
}

export function createRun(runId: string, task: string, windowId: number): void {
  const root = runsRoot()
  // 同一秒内连开两次会撞名，用 runId 前四位兜底
  const dir = join(root, `${stamp()}-${runId.slice(0, 4)}`)
  mkdirSync(dir, { recursive: true })
  active = { runId, dir }
  writeMeta(dir, {
    name: basename(dir),
    runId,
    task,
    startedAt: Date.now(),
    endedAt: null,
    reason: null,
  })
  appendLog(runId, `任务：${task}`)
  appendLog(runId, `目标窗口：${windowId}`)
}

export function appendLog(runId: string, line: string): void {
  const dir = dirOf(runId)
  if (!dir) return
  appendFileSync(join(dir, LOG_NAME), `${clock()} ${redact(line)}\n`, 'utf8')
}

export function saveShot(runId: string, step: number, dataUrl: string): void {
  const dir = dirOf(runId)
  if (!dir) return
  const base64 = dataUrl.split(',')[1]
  if (!base64) return
  writeFileSync(join(dir, `step-${pad(step)}.png`), Buffer.from(base64, 'base64'))
}

export function finishRun(runId: string, reason: string): void {
  const dir = dirOf(runId)
  if (!dir) return
  appendLog(runId, `结束：${reason}`)
  const meta = readMeta(dir)
  if (!meta) return
  writeMeta(dir, { ...meta, endedAt: Date.now(), reason })
  active = null
}

function readMeta(dir: string): RunMeta | null {
  try {
    return JSON.parse(readFileSync(join(dir, META_NAME), 'utf8')) as RunMeta
  } catch {
    return null
  }
}

export function listRuns(): RunMeta[] {
  let entries: string[] = []
  try {
    entries = readdirSync(runsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }

  return entries
    .map((name) => readMeta(join(runsRoot(), name)))
    .filter((meta): meta is RunMeta => meta != null)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_RUNS)
}

export function readRun(name: string): RunLog {
  // 名字来自渲染进程，只取最后一段，避免拼出 runs/ 之外的路径
  const dir = join(runsRoot(), basename(name))
  let text = ''
  try {
    text = readFileSync(join(dir, LOG_NAME), 'utf8')
  } catch {
    text = '（日志文件为空或已被删除）'
  }
  return { meta: readMeta(dir), text }
}

/** 时间线点开大图时按运行取原始标注图；取不到时界面退回缩略图 */
export function readShot(runId: string, step: number): string | null {
  const dir = dirOf(runId) ?? findDirByRunId(runId)
  if (!dir) return null
  try {
    const png = readFileSync(join(dir, `step-${pad(step)}.png`))
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}

/** 应用重启后内存里没有活动运行，按 meta.json 反查目录 */
function findDirByRunId(runId: string): string | null {
  const meta = listRuns().find((item) => item.runId === runId)
  return meta ? join(runsRoot(), meta.name) : null
}
