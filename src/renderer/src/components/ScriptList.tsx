import { Box, Typography } from '@mui/material'
import type { ScriptSummary } from '@shared/script'
import type { SkillSummary } from '@shared/types'

interface Entry {
  id: string
  skillName: string
  script: ScriptSummary
}

/** 只读清单：脚本随技能加载，什么时候调用由模型判断，这里没有运行入口 */
export default function ScriptList({ skills }: { skills: SkillSummary[] }) {
  const entries: Entry[] = skills.flatMap((skill) =>
    skill.script ? [{ id: skill.id, skillName: skill.name, script: skill.script }] : [],
  )

  if (entries.length === 0) {
    return (
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
        还没有脚本：把 script.json 放进技能目录、和 SKILL.md 同级
      </Typography>
    )
  }
  return (
    <>
      {entries.map((entry) => (
        <ScriptRow key={entry.id} entry={entry} />
      ))}
    </>
  )
}

function ScriptRow({ entry }: { entry: Entry }) {
  const { script } = entry
  return (
    <Box sx={{ py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500 }}>
          {script.name}
        </Typography>
        <Typography variant="caption" sx={{ flex: 'none', color: 'text.secondary' }}>
          {script.steps} 步
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}
      >
        所属技能：{entry.skillName}
        {script.params.length > 0 ? ` · 参数：${script.params.join('、')}` : ''}
      </Typography>
    </Box>
  )
}
