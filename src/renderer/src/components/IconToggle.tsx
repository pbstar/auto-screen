import type { ReactNode } from 'react'
import { Button, Tooltip } from '@mui/material'

interface Props {
  checked: boolean
  onChange: (on: boolean) => void
  /** 悬浮说明，同时作为无障碍标签 */
  title: string
  /** 右侧面板与胶囊同排时保留细边框；工具栏里的幽灵控件不描边 */
  outlined?: boolean
  children: ReactNode
}

/** 26px 圆形开关按钮：开合靠底色区分，文字只在悬浮时出现 */
export default function IconToggle({ checked, onChange, title, outlined, children }: Props) {
  return (
    <Tooltip title={title}>
      <Button
        size="small"
        aria-pressed={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        sx={{
          width: 26,
          height: 26,
          minWidth: 0,
          p: 0,
          borderRadius: '50%',
          border: 1,
          borderColor: outlined && !checked ? 'divider' : 'transparent',
          bgcolor: checked ? 'rgba(15, 23, 42, 0.09)' : 'transparent',
          color: checked ? 'text.primary' : 'text.secondary',
          '&:hover': {
            borderColor: outlined && !checked ? '#c9d1db' : 'transparent',
            bgcolor: checked ? 'rgba(15, 23, 42, 0.14)' : 'rgba(15, 23, 42, 0.045)',
          },
        }}
      >
        {children}
      </Button>
    </Tooltip>
  )
}
