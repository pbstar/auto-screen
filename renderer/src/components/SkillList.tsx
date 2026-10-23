import { Box, Typography } from '@mui/material'

interface SkillItem {
  name: string
  description: string
}

// M3 会从 skills/ 目录解析出真实技能，这里先是占位
const SKILLS: SkillItem[] = [
  { name: '通用操作', description: '按界面提示逐步操作' },
  { name: '表单填写', description: '依次填写表单字段' },
  { name: '重复操作', description: '对列表逐项处理' },
]

export default function SkillList() {
  return (
    <>
      {SKILLS.map((skill) => (
        <Box
          key={skill.name}
          sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, py: 0.4 }}
        >
          <Typography sx={{ fontSize: 12, width: 76, flex: 'none', color: 'text.secondary' }}>
            {skill.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0, flex: 1 }}>
            {skill.description}
          </Typography>
          <Typography variant="caption" sx={{ flex: 'none', color: 'text.disabled' }}>
            M3
          </Typography>
        </Box>
      ))}
    </>
  )
}
