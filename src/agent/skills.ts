import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SkillSummary } from '../shared/types'
import type { SkillPrompt } from './prompts/agent'
import { parseFrontmatter } from './frontmatter'

const SKILL_FILE = 'SKILL.md'

/** 开发时读项目根目录，打包后读 userData */
export function skillsRoot(): string {
  return app.isPackaged
    ? join(app.getPath('userData'), 'skills')
    : join(process.cwd(), 'skills')
}

interface ParsedSkill {
  summary: SkillSummary
  body: string
}

function readOne(id: string): ParsedSkill | null {
  const path = join(skillsRoot(), id, SKILL_FILE)
  if (!existsSync(path)) return null
  try {
    const { meta, body } = parseFrontmatter(readFileSync(path, 'utf8'))
    // 没有 name 的 SKILL.md 算不上技能，跳过，免得界面出现一条空白
    if (!meta.name) return null
    return {
      summary: { id, name: meta.name, description: meta.description ?? '' },
      body,
    }
  } catch {
    return null
  }
}

/** 固定按目录名排序，勾选顺序不影响系统提示，前缀缓存才稳 */
function readAll(): ParsedSkill[] {
  let entries: string[] = []
  try {
    entries = readdirSync(skillsRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
  return entries
    .map(readOne)
    .filter((skill): skill is ParsedSkill => skill != null)
}

export function listSkills(): SkillSummary[] {
  return readAll().map((skill) => skill.summary)
}

/** 只取用户勾选的那些；重名或已删除的目录按 id 过滤，调用方不用再校验 */
export function readSkillPrompts(ids: string[]): SkillPrompt[] {
  const wanted = new Set(ids)
  return readAll()
    .filter((skill) => wanted.has(skill.summary.id))
    .map((skill) => ({ name: skill.summary.name, body: skill.body }))
}

function stampId(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  return `auto-${day}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

/**
 * 目录名优先用模型给出的英文 slug，读起来比时间戳有意义；
 * 只保留小写字母、数字和短横线，不合格时退回时间戳。
 */
function slugOf(value: string | null | undefined): string | null {
  if (!value) return null
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return slug.length >= 2 ? slug : null
}

/** 自动生成的技能永远新开目录：同名就加序号，宁可有重复也不能覆盖已有的手册 */
function freeId(base: string): string {
  let id = base
  for (let n = 2; existsSync(join(skillsRoot(), id)); n += 1) id = `${base}-${n}`
  return id
}

/** frontmatter 只写单行，正文里的换行原样保留 */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 200)
}

/** 把沉淀出来的手册写成 skills/<slug>/SKILL.md，返回它在下一次扫描里的样子 */
export function saveSkill(input: {
  /** 模型给出的英文目录名，不合规时回退到时间戳 */
  id?: string | null
  name: string
  description: string
  body: string
}): SkillSummary {
  const name = oneLine(input.name)
  const description = oneLine(input.description)
  const id = freeId(slugOf(input.id) ?? stampId())
  const dir = join(skillsRoot(), id)
  mkdirSync(dir, { recursive: true })
  const text = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    '---',
    '',
    input.body.trim(),
    '',
  ].join('\n')
  writeFileSync(join(dir, SKILL_FILE), text, 'utf8')
  return { id, name, description }
}
