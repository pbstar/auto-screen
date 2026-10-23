import { Box, Divider, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { WindowInfo } from '@shared/types'

interface Props {
  windows: WindowInfo[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function WindowList({ windows, selectedId, onSelect }: Props) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
        目标窗口（{windows.length}）
      </Typography>
      <Divider sx={{ my: 0.5 }} />
      {windows.length === 0 ? (
        <Typography variant="body2" sx={{ px: 2, py: 2, color: 'text.secondary' }}>
          没有可操作的窗口，点右上角刷新
        </Typography>
      ) : (
        <List dense disablePadding>
          {windows.map((win) => (
            <ListItemButton
              key={win.id}
              selected={win.id === selectedId}
              onClick={() => onSelect(win.id)}
              sx={{ alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={win.title || win.appName || '无标题窗口'}
                secondary={`${win.appName} · ${win.width}×${win.height}`}
                slotProps={{
                  primary: { noWrap: true, variant: 'body2' },
                  secondary: { noWrap: true, variant: 'caption' },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  )
}
