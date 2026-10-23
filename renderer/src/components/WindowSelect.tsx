import { Box, MenuItem, Select, Typography } from '@mui/material'
import type { WindowInfo } from '@shared/types'

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

/** 放在预览区工具栏，宽度固定，收起态单行截断 */
export default function WindowSelect({ windows, selectedId, disabled, onSelect, onOpen }: Props) {
  const selected = windows.find((win) => win.id === selectedId) ?? null

  return (
    <Select
      size="small"
      displayEmpty
      disabled={disabled}
      onOpen={() => onOpen?.()}
      value={selectedId ?? ''}
      onChange={(event) => onSelect(Number(event.target.value))}
      renderValue={() => (
        <Typography variant="body2" noWrap>
          {selected ? labelOf(selected) : '未选择窗口'}
        </Typography>
      )}
      sx={{
        minWidth: 160,
        maxWidth: 280,
        width: 'fit-content',
        borderRadius: '6px',
        transition: 'background-color 120ms ease, box-shadow 120ms ease',
        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.045)' },
        '&.Mui-focused': {
          bgcolor: 'rgba(15, 23, 42, 0.045)',
          boxShadow: 'inset 0 0 0 1px #c9d1db',
        },
        '& .MuiSelect-select': { py: 0.75, pl: 1, pr: 3.5 },
        '& .MuiSelect-icon': { right: 6, color: 'text.disabled' },
      }}
    >
      {windows.map((win) => (
        <MenuItem key={win.id} value={win.id}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {win.title || '无标题窗口'}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {win.appName} · {win.width}×{win.height}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  )
}
