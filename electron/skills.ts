import { app } from 'electron'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SkillSummary } from '../src/shared/types'
import type { SkillPrompt } from './agent/prompt'
import { parseFrontmatter } from './frontmatter'

const SKILL_FILE = 'SKILL.md'

/** 开发时读项目根目录，打包后读 userData，与 .env 的取法一致 */
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
