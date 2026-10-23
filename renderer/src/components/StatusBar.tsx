import { Box, Chip, Typography } from '@mui/material'
import type { CaptureResult, PermissionStatus, WindowInfo } from '@shared/types'

interface Props {
  permissions: PermissionStatus | null
  capture: CaptureResult | null
  selectedWindow: WindowInfo | null
}

const SCREEN_LABELS: Record<string, string> = {
  granted: '已授权',
  denied: '已拒绝',
  restricted: '受限',
  'not-determined': '未授权',
  unknown: '未知',
}

export default function StatusBar({ permissions, capture, selectedWindow }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: 2,
        py: 0.75,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Auto Screen · M1
      </Typography>

      {permissions?.platform === 'darwin' ? (
        <>
          <Chip
            size="small"
            variant="outlined"
            color={permissions.screen === 'granted' ? 'success' : 'warning'}
            label={`屏幕录制：${SCREEN_LABELS[permissions.screen] ?? permissions.screen}`}
          />
          <Chip
            size="small"
            variant="outlined"
            color={permissions.accessibility ? 'success' : 'warning'}
            label={`辅助功能：${permissions.accessibility ? '已授权' : '未授权'}`}
          />
        </>
      ) : (
        <Chip size="small" variant="outlined" label="系统权限：无需额外授权" />
      )}

      {selectedWindow && (
        <Chip
          size="small"
          variant="outlined"
          label={`窗口 ${selectedWindow.width}×${selectedWindow.height} · 缩放 ${selectedWindow.monitor.scaleFactor}x`}
        />
      )}

      {capture && (
        <Chip size="small" variant="outlined" label={`截图 ${capture.width}×${capture.height} px`} />
      )}

      <Box sx={{ flex: 1 }} />
      <Typography variant="caption" color="text.secondary">
        原点左上角 · 小格 10px · 大格 100px
      </Typography>
    </Box>
  )
}
