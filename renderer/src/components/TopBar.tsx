import { Box, Button, Typography } from '@mui/material'
import type { WindowInfo } from '@shared/types'
import WindowSelect from './WindowSelect'

interface Props {
  windows: WindowInfo[]
  selectedId: number | null
  /** 运行中切窗口会让预览与 Agent 指向不同目标，直接禁用 */
  windowLocked: boolean
  onSelect: (id: number) => void
  onRefreshWindows: () => void
  onOpenLogs: () => void
}

export default function TopBar({
  windows,
  selectedId,
  windowLocked,
  onSelect,
  onRefreshWindows,
  onOpenLogs,
}: Props) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        height: 48,
        px: 2,
        flex: 'none',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: 'primary.main' }} />
      <Typography sx={{ fontWeight: 600, fontSize: 13.5, letterSpacing: 0.2, mr: 1 }}>
        Auto Screen
      </Typography>
      <WindowSelect
        windows={windows}
        selectedId={selectedId}
        disabled={windowLocked}
        onSelect={onSelect}
        onOpen={onRefreshWindows}
      />
      <Box sx={{ flex: 1 }} />
      <Button onClick={onOpenLogs} sx={{ color: 'text.secondary' }}>
        日志
      </Button>
    </Box>
  )
}
