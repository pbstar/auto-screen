import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import type { SkillSummary } from '@shared/types'

interface Props {
  skills: SkillSummary[]
  selected: string[]
  disabled: boolean
  onToggle: (id: string) => void
}

/** 技能靠用户勾选注入，不做自动匹配：选错手册比不选更糟 */
export default function SkillList({ skills, selected, disabled, onToggle }: Props) {
  if (skills.length === 0) {
    return (
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', py: 0.5 }}>
        {'把 SKILL.md 放到 skills/<目录>/ 下，改完点「刷新」'}
      </Typography>
    )
  }

  return (
    <>
      {skills.map((skill) => (
        <FormControlLabel
          key={skill.id}
          disabled={disabled}
          control={
            <Checkbox
              size="small"
              checked={selected.includes(skill.id)}
              onChange={() => onToggle(skill.id)}
              sx={{ py: 0.25, pl: 0.5, pr: 1 }}
            />
          }
          label={
            <Box sx={{ minWidth: 0, py: 0.35 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 500 }} noWrap>
                {skill.name}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ display: 'block', color: 'text.secondary' }}
              >
                {skill.description || '（没有描述）'}
              </Typography>
            </Box>
          }
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            mx: 0,
            width: '100%',
            '& .MuiFormControlLabel-label': { minWidth: 0 },
          }}
        />
      ))}
    </>
  )
}
