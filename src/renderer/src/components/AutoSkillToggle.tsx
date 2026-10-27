import { Box, Button, Tooltip } from '@mui/material'

interface Props {
  checked: boolean
  onChange: (on: boolean) => void
}

/** 四角星：一眼看出是「自动整理出点什么」，比文字标签省位置 */
function SparkleIcon() {
  return (
    <Box component="svg" viewBox="0 0 16 16" sx={{ width: 13, height: 13, display: 'block' }}>
      <path
        d="M8 1.6l1.5 4.1 4.1 1.5-4.1 1.5L8 12.8 6.5 8.7 2.4 7.2l4.1-1.5L8 1.6z"
        fill="currentColor"
      />
    </Box>
  )
}

/** 任务完成后的自动沉淀开关：与三个胶囊同高，开合靠底色区分，文字只在悬浮时出现 */
export default function AutoSkillToggle({ checked, onChange }: Props) {
  return (
    <Tooltip
      title={
        `自动沉淀技能（${checked ? '已开启' : '已关闭'}）：` +
        '任务完成后把这次的操作流程整理成技能手册，生成后不会自动勾选'
      }
    >
      <Button
        size="small"
        aria-pressed={checked}
        aria-label="自动沉淀技能"
        onClick={() => onChange(!checked)}
        sx={{
          width: 26,
          height: 26,
          minWidth: 0,
          p: 0,
          borderRadius: '50%',
          border: 1,
          borderColor: checked ? 'transparent' : 'divider',
          bgcolor: checked ? 'rgba(15, 23, 42, 0.09)' : 'background.paper',
          color: checked ? 'text.primary' : 'text.secondary',
          '&:hover': {
            borderColor: checked ? 'transparent' : '#c9d1db',
            bgcolor: checked ? 'rgba(15, 23, 42, 0.14)' : 'rgba(15, 23, 42, 0.045)',
          },
        }}
      >
        <SparkleIcon />
      </Button>
    </Tooltip>
  )
}
