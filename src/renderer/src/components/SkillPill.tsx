import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import type { SkillSummary } from '@shared/types'
import PopoverPill from './PopoverPill'

interface Props {
  skills: SkillSummary[]
  selected: string[]
  disabled: boolean
  onToggle: (id: string) => void
  onReload: () => void
}

/** 胶囊上直接显示这次会带哪份手册，不用打开浮层也知道 */
function detailOf(skills: SkillSummary[], selected: string[]): string | undefined {
  if (selected.length === 0) return undefined
  if (selected.length === 1) return skills.find((skill) => skill.id === selected[0])?.name
  return `${selected.length} 项`
}

export default function SkillPill({ skills, selected, disabled, onToggle, onReload }: Props) {
  return (
    <PopoverPill
      label="技能"
      detail={detailOf(skills, selected)}
      disabled={disabled}
      onOpen={onReload}
    >
      {skills.length === 0 ? (
        <Typography variant="caption" sx={{ display: 'block', px: 0.5, color: 'text.secondary' }}>
          {'把 SKILL.md 放进 skills/<目录>/ 后重新打开这里'}
        </Typography>
      ) : (
        skills.map((skill) => (
          <FormControlLabel
            key={skill.id}
            control={
              <Checkbox
                size="small"
                checked={selected.includes(skill.id)}
                onChange={() => onToggle(skill.id)}
                sx={{ py: 0.25, pl: 0.5, pr: 1 }}
              />
            }
            label={
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>
                  {skill.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}
                >
                  {skill.description || '（没有描述）'}
                </Typography>
                {/* 脚本和 SKILL.md 在同一个目录里，界面上也挂在技能下面，不另立一类 */}
                {skill.scripts?.map((script, index) => (
                  <Typography
                    key={`${script.name}-${index}`}
                    variant="caption"
                    sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}
                  >
                    脚本《{script.name}》 · {script.steps} 步
                  </Typography>
                ))}
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
        ))
      )}
      {skills.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 1,
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          技能目录的 scripts/ 下放 .json（一个文件一个脚本），勾选后会随技能逐个注册成工具。
        </Typography>
      )}
    </PopoverPill>
  )
}
