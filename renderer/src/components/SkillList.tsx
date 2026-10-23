import { Box, Button, List, ListItem, ListItemText, Tooltip, Typography } from '@mui/material'

interface SkillItem {
  id: string
  name: string
  description: string
}

// M3 会换成主进程扫描 skills/ 的真实数据，这里先占位撑起界面
const SKILLS: SkillItem[] = [
  { id: 'general', name: '通用操作', description: '按界面提示逐步操作' },
  { id: 'form', name: '表单填写', description: '依次填写表单字段' },
  { id: 'repeat', name: '重复操作', description: '对列表逐项处理' },
]

export default function SkillList() {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        技能（{SKILLS.length}）
      </Typography>
      <List dense disablePadding>
        {SKILLS.map((skill) => (
          <ListItem
            key={skill.id}
            disableGutters
            secondaryAction={
              <Tooltip title="接入模型后才能执行">
                <span>
                  <Button size="small" disabled>
                    执行
                  </Button>
                </span>
              </Tooltip>
            }
          >
            <ListItemText
              primary={skill.name}
              secondary={skill.description}
              slotProps={{
                primary: { noWrap: true, variant: 'body2' },
                secondary: { noWrap: true, variant: 'caption' },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
