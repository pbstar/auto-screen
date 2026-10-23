import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import dotenv from 'dotenv'
import type { ReasoningEffort } from '../src/shared/agent'

export type { ReasoningEffort }

export interface ModelConfig {
  apiKey: string
  baseUrl: string
  model: string
  reasoningEffort: ReasoningEffort
}

const EFFORTS: readonly ReasoningEffort[] = ['low', 'high', 'max']
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

function readEffort(): ReasoningEffort {
  const raw = process.env.DEEPSEEK_REASONING_EFFORT?.trim()
  return EFFORTS.includes(raw as ReasoningEffort) ? (raw as ReasoningEffort) : 'low'
}

export function readModelConfig(): ModelConfig {
  loadEnv()
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() ?? ''
  if (!apiKey) {
    throw new Error('未配置 DEEPSEEK_API_KEY，请复制 .env.example 为 .env 并填入 Key')
  }
  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash',
    reasoningEffort: readEffort(),
  }
}

/** 界面只关心 Key 是否填了，不回传 Key 本身 */
export function configReady(): boolean {
  loadEnv()
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
}
