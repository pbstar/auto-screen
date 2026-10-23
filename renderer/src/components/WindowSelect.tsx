import { Box, MenuItem, Select, Typography } from '@mui/material'
import type { WindowInfo } from '@shared/types'

interface Props {
  windows: WindowInfo[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function labelOf(win: WindowInfo): string {
  return `${win.appName} · ${win.title || '无标题窗口'}`
}

export default function WindowSelect({ windows, selectedId, onSelect }: Props) {
  const selected = windows.find((win) => win.id === selectedId) ?? null

  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        目标窗口（{windows.length}）
      </Typography>
      <Select
        size="small"
        fullWidth
        displayEmpty
        value={selectedId ?? ''}
        onChange={(event) => onSelect(Number(event.target.value))}
        renderValue={() => (selected ? labelOf(selected) : '未选择窗口')}
        sx={{ '& .MuiSelect-select': { py: 0.75 } }}
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
    </Box>
  )
}
