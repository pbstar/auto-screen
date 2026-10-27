import { app } from 'electron'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'
import type { ModelSettings, ModelSettingsInput } from '../shared/types'

export interface ModelConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-flash'

let envLoaded = false

/** 开发时读项目根目录，打包后读 userData；两处都支持，谁存在用谁 */
export function loadEnv(): void {
  if (envLoaded) return
  envLoaded = true
  const path = app.isPackaged
    ? join(app.getPath('userData'), '.env')
    : join(process.cwd(), '.env')
  if (existsSync(path)) {
    dotenv.config({ path })
  }
}

/** 界面里填的配置存这里；Key 不放进仓库，所以始终落在 userData */
function settingsPath(): string {
  return join(app.getPath('userData'), 'model.json')
}

interface StoredSettings {
  baseUrl?: string
  model?: string
  apiKey?: string
}

function readStored(): StoredSettings {
  try {
    const parsed: unknown = JSON.parse(readFileSync(settingsPath(), 'utf8'))
    if (!parsed || typeof parsed !== 'object') return {}
    const record = parsed as Record<string, unknown>
    const text = (value: unknown): string | undefined =>
      typeof value === 'string' && value.trim() ? value.trim() : undefined
    return { baseUrl: text(record.baseUrl), model: text(record.model), apiKey: text(record.apiKey) }
  } catch {
    // 文件不存在或损坏都按「没配过」处理，回退到环境变量
    return {}
  }
}

/** 优先级：界面保存的配置 > .env > 默认值，逐项回退 */
function resolve(): ModelConfig {
  loadEnv()
  const stored = readStored()
  return {
    apiKey: stored.apiKey ?? process.env.DEEPSEEK_API_KEY?.trim() ?? '',
    baseUrl: stored.baseUrl ?? process.env.DEEPSEEK_BASE_URL?.trim() ?? DEFAULT_BASE_URL,
    model: stored.model ?? process.env.DEEPSEEK_MODEL?.trim() ?? DEFAULT_MODEL,
  }
}

export function readModelConfig(): ModelConfig {
  const config = resolve()
  if (!config.apiKey) {
    throw new Error('还没有配置 API Key，点任务卡右上角的「⋮ → 配置模型」填写')
  }
  return config
}

/** 界面只关心 Key 是否填了，不回传 Key 本身 */
export function configReady(): boolean {
  return Boolean(resolve().apiKey)
}

function maskKey(apiKey: string): string {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '***'
  return `${apiKey.slice(0, 3)}***${apiKey.slice(-4)}`
}

export function readModelSettings(): ModelSettings {
  const config = resolve()
  return {
    baseUrl: config.baseUrl,
    model: config.model,
    apiKeySet: Boolean(config.apiKey),
    apiKeyHint: maskKey(config.apiKey),
  }
}

/** 保存界面配置；apiKey 留空表示沿用已保存的 Key（可能来自 .env） */
export function saveModelSettings(input: ModelSettingsInput): ModelSettings {
  const baseUrl = input.baseUrl.trim()
  const model = input.model.trim()
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error('接口地址需要以 http:// 或 https:// 开头')
  }
  if (!model) throw new Error('模型 ID 不能为空')

  const path = settingsPath()
  const apiKey = input.apiKey?.trim() || readStored().apiKey || ''
  mkdirSync(dirname(path), { recursive: true })
  const text = JSON.stringify({ baseUrl, model, ...(apiKey ? { apiKey } : {}) }, null, 2)
  writeFileSync(path, text, { encoding: 'utf8', mode: 0o600 })
  // 文件已存在时 mode 不生效，再显式收紧一次；失败不影响保存
  try {
    chmodSync(path, 0o600)
  } catch {
    // 某些文件系统不支持权限位，忽略
  }
  return readModelSettings()
}
