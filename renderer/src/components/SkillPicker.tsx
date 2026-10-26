import { Box, Button, Chip, Tooltip, Typography } from '@mui/material'
import type { SkillSummary } from '@shared/types'

interface Props {
  skills: SkillSummary[]
  selected: string[]
  disabled: boolean
  onToggle: (id: string) => void
  onRefresh: () => void
}

/**
 * 技能紧贴任务输入：勾选决定这次任务带哪份手册，属于任务本身而不是参考资料。
 * 用标签而不是下拉，是为了让「有哪些手册」一眼可见，点一下就切换。
 */
export default function SkillPicker({ skills, selected, disabled, onToggle, onRefresh }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
      <Typography
        sx={{ fontSize: 11, lineHeight: '24px', color: 'text.secondary', mr: 1, flex: 'none' }}
      >
        技能
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, minWidth: 0 }}>
        {skills.length === 0 ? (
          <Typography sx={{ fontSize: 11, lineHeight: '24px', color: 'text.secondary' }}>
            {'把 SKILL.md 放进 skills/<目录>/ 后点「刷新」'}
          </Typography>
        ) : (
          skills.map((skill) => (
            <Tooltip key={skill.id} title={skill.description || skill.name} placement="top">
              {/* 禁用的 Chip 不触发鼠标事件，包一层 span 才能显示提示 */}
              <span>
                <Chip
                  label={skill.name}
                  size="small"
                  disabled={disabled}
                  onClick={() => onToggle(skill.id)}
                  variant={selected.includes(skill.id) ? 'filled' : 'outlined'}
                  color={selected.includes(skill.id) ? 'primary' : 'default'}
                  sx={{ height: 24, fontSize: 11, '& .MuiChip-label': { px: 1 } }}
                />
              </span>
            </Tooltip>
          ))
        )}
      </Box>

      <Button
        size="small"
        color="inherit"
        disabled={disabled}
        onClick={onRefresh}
        sx={{ minWidth: 0, px: 1, mr: -1, fontSize: 11, color: 'text.secondary', flex: 'none' }}
      >
        刷新
      </Button>
    </Box>
  )
}
