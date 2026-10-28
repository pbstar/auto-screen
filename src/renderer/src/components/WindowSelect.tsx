import { useState } from 'react'
import { Box, Button, Menu, MenuItem, Tooltip, Typography } from '@mui/material'
import type { WindowInfo } from '@shared/types'
import { WASH } from '../theme'
import { ChevronDownIcon } from './icons'

interface Props {
  windows: WindowInfo[]
  selectedId: number | null
  disabled?: boolean
  onSelect: (id: number) => void
  /** 展开时刷新窗口列表，新开的窗口不用再点按钮 */
  onOpen?: () => void
}

function labelOf(win: WindowInfo): string {
  return `${win.appName} · ${win.title || '无标题窗口'}`
}

/**
 * 预览工具栏里的窗口选择：无边框的幽灵按钮 + 菜单。
 * 不用带描边的 Select，工具栏里不该出现表单控件的外观。
 */
export default function WindowSelect({ windows, selectedId, disabled, onSelect, onOpen }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const selected = windows.find((win) => win.id === selectedId) ?? null

  const trigger = (
    <Button
      size="small"
      disabled={disabled}
      onClick={(event) => {
        setAnchor(event.currentTarget)
        onOpen?.()
      }}
      sx={{
        height: 28,
        minWidth: 0,
        px: 1,
        gap: 0.5,
        color: selected ? 'text.primary' : 'text.secondary',
        fontWeight: 500,
        '&:hover': { bgcolor: WASH },
        '&.Mui-disabled': { color: 'text.disabled' },
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 13,
          maxWidth: 300,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {selected ? labelOf(selected) : '选择窗口'}
      </Typography>
      <ChevronDownIcon />
    </Button>
  )

  return (
    <>
      {disabled ? (
        <Tooltip title="任务运行中不能切换窗口">
          <Box component="span" sx={{ display: 'inline-flex' }}>
            {trigger}
          </Box>
        </Tooltip>
      ) : (
        trigger
      )}
      <Menu
        anchorEl={anchor}
        open={anchor != null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.5, width: 340, maxHeight: 360 } } }}
      >
        {windows.length === 0 ? (
          <Typography
            variant="caption"
            sx={{ display: 'block', px: 1.5, py: 1, color: 'text.secondary' }}
          >
            没有可操作的窗口
          </Typography>
        ) : (
          windows.map((win) => (
            <MenuItem
              key={win.id}
              selected={win.id === selectedId}
              onClick={() => {
                setAnchor(null)
                onSelect(win.id)
              }}
              sx={{ py: 0.75 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {win.title || '无标题窗口'}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ display: 'block', color: 'text.secondary' }}
                >
                  {win.appName} · {win.width}×{win.height}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  )
}
