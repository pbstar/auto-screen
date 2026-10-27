import { useState } from 'react'
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { MoreIcon } from './icons'

interface Props {
  onOpenModelConfig: () => void
  onOpenLogs: () => void
}

/** 任务卡右上角的「更多」：不常用的入口收进菜单，标题行留白给状态读数 */
export default function MoreMenu({ onOpenModelConfig, onOpenLogs }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const choose = (action: () => void) => () => {
    setAnchor(null)
    action()
  }

  return (
    <>
      <Tooltip title="更多">
        <IconButton
          size="small"
          aria-label="更多"
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ width: 24, height: 24, p: 0, color: 'text.secondary' }}
        >
          <MoreIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={anchor != null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 132 } } }}
      >
        <MenuItem onClick={choose(onOpenModelConfig)}>配置模型</MenuItem>
        <MenuItem onClick={choose(onOpenLogs)}>运行日志</MenuItem>
      </Menu>
    </>
  )
}
