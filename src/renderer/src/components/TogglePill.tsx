import type { ReactNode } from 'react'
import { Button, Tooltip } from '@mui/material'

interface Props {
  checked: boolean
  onChange: (on: boolean) => void
  /** 悬浮说明，同时作为无障碍标签 */
  title: string
  /** 图标后的文字；没有文字时收成 26px 圆钮 */
  label?: string
  /** 工具栏里的幽灵样式：未选中时不描边 */
  ghost?: boolean
  children: ReactNode
}

/** 胶囊开关：选中态整块填充墨色，一眼能看出开没开 */
export default function TogglePill({ checked, onChange, title, label, ghost, children }: Props) {
  return (
    <Tooltip title={title}>
      <Button
        size="small"
        aria-pressed={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        sx={{
          height: 26,
          minWidth: 0,
          width: label ? 'auto' : 26,
          px: label ? 1.25 : 0,
          gap: 0.75,
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 500,
          border: 1,
          borderColor: checked ? 'transparent' : ghost ? 'transparent' : 'divider',
          bgcolor: checked ? 'text.primary' : ghost ? 'transparent' : 'background.paper',
          color: checked ? 'background.paper' : 'text.secondary',
          '&:hover': {
            bgcolor: checked ? '#3a424e' : 'rgba(15, 23, 42, 0.06)',
            borderColor: checked ? 'transparent' : ghost ? 'transparent' : '#c9d1db',
          },
        }}
      >
        {children}
        {label}
      </Button>
    </Tooltip>
  )
}
