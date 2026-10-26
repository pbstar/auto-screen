import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import type { SkillSummary, ToolSummary } from '@shared/types'
import { MONO_FONT } from '../theme'
import SkillList from './SkillList'
import ToolList from './ToolList'

const api = window.autoScreen

interface Props {
  skills: SkillSummary[]
  selectedSkills: string[]
  /** 运行中不允许改勾选，免得提示与正在跑的任务对不上 */
  skillsLocked: boolean
  onToggleSkill: (id: string) => void
  onRefreshSkills: () => void
}

/** 面板底部：可勾选的技能 + 只读的工具清单 */
export default function ReferencePanel({
  skills,
  selectedSkills,
  skillsLocked,
  onToggleSkill,
  onRefreshSkills,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void api.listTools().then((result) => {
      if (result.ok) setTools(result.data)
      else setError(result.error)
    })
  }, [])

  return (
    <Box sx={{ flex: 'none', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 36, px: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>技能</Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: 11, color: 'text.disabled' }}>
          {selectedSkills.length}/{skills.length}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          color="inherit"
          onClick={onRefreshSkills}
          sx={{ minWidth: 0, px: 1, fontSize: 11, color: 'text.secondary' }}
        >
          刷新
        </Button>
        <Button
          size="small"
          color="inherit"
          onClick={() => setCollapsed((value) => !value)}
          sx={{ minWidth: 0, px: 1, mr: -1, fontSize: 11, color: 'text.secondary' }}
        >
          {collapsed ? '展开' : '收起'}
        </Button>
      </Box>

      {!collapsed && (
        <Box sx={{ height: 200, overflowY: 'auto', px: 1.5, pb: 1 }}>
          <SkillList
            skills={skills}
            selected={selectedSkills}
            disabled={skillsLocked}
            onToggle={onToggleSkill}
          />
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1.25, mb: 0.25 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
              工具
            </Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: 11, color: 'text.disabled' }}>
              {tools.length}
            </Typography>
          </Box>
          <ToolList tools={tools} error={error} />
        </Box>
      )}
    </Box>
  )
}
