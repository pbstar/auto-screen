import { Box, Typography } from '@mui/material'
import type { ScriptSummary } from '@shared/script'
import type { SkillSummary } from '@shared/types'
import PopoverPill from './PopoverPill'

interface Entry {
  id: string
  skillName: string
  script: ScriptSummary
}

/** 脚本随技能一起加载；怎么调用由模型判断，这里只回答「当前有哪些脚本」 */
export default function ScriptPill({ skills }: { skills: SkillSummary[] }) {
  const entries: Entry[] = skills.flatMap((skill) =>
    skill.script ? [{ id: skill.id, skillName: skill.name, script: skill.script }] : [],
  )

  return (
    <PopoverPill label="脚本" detail={entries.length > 0 ? String(entries.length) : undefined}>
      {entries.length === 0 ? (
        <Typography variant="caption" sx={{ display: 'block', px: 0.5, color: 'text.secondary' }}>
          在技能目录里放一份 script.json，就能让模型用一次调用跑完固定流程
        </Typography>
      ) : (
        entries.map((entry) => <ScriptRow key={entry.id} entry={entry} />)
      )}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 1,
          pt: 1,
          borderTop: 1,
          borderColor: 'divider',
          color: 'text.secondary',
        }}
      >
        脚本内置于技能目录，由模型在合适的时机调用，不在这里手动运行。
      </Typography>
    </PopoverPill>
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
