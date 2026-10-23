import { Box, MenuItem, Select, Typography } from '@mui/material'
import type { WindowInfo } from '@shared/types'

interface Props {
  windows: WindowInfo[]
  selectedId: number | null
  disabled?: boolean
  onSelect: (id: number) => void
}

function labelOf(win: WindowInfo): string {
  return `${win.appName} · ${win.title || '无标题窗口'}`
}

/** 放在顶栏，宽度受限于工具栏，收起态单行截断 */
export default function WindowSelect({ windows, selectedId, disabled, onSelect }: Props) {
  const selected = windows.find((win) => win.id === selectedId) ?? null

  return (
    <Select
      size="small"
      displayEmpty
      disabled={disabled}
      value={selectedId ?? ''}
      onChange={(event) => onSelect(Number(event.target.value))}
      renderValue={() => (
        <Typography variant="body2" noWrap>
          {selected ? labelOf(selected) : '未选择窗口'}
        </Typography>
      )}
      sx={{ width: 240, '& .MuiSelect-select': { py: 0.75 } }}
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
