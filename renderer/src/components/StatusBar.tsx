import { Box, Chip, Typography } from '@mui/material'
import type { CaptureResult, PermissionStatus, WindowInfo } from '@shared/types'
import type { AgentRunState } from '../hooks/useAgentRun'

interface Props {
  permissions: PermissionStatus | null
  capture: CaptureResult | null
  selectedWindow: WindowInfo | null
  lastAction: string
  agent: AgentRunState
}

const SCREEN_LABELS: Record<string, string> = {
  granted: '已授权',
  denied: '已拒绝',
  restricted: '受限',
  'not-determined': '未授权',
  unknown: '未知',
}

const AGENT_LABELS: Record<AgentRunState['status'], string> = {
  idle: '空闲',
  running: '运行中',
  stopping: '停止中',
}

function formatTokens(agent: AgentRunState): string {
  const total = agent.usage.prompt + agent.usage.completion
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)
}

export default function StatusBar({
  permissions,
  capture,
  selectedWindow,
  lastAction,
  agent,
}: Props) {
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
        Auto Screen · M2
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

      <Chip
        size="small"
        variant="outlined"
        color={agent.status === 'idle' ? 'default' : 'success'}
        label={`Agent：${AGENT_LABELS[agent.status]}`}
      />
      <Chip
        size="small"
        variant="outlined"
        label={`步骤 ${agent.step}/${agent.maxSteps} · tokens ${formatTokens(agent)}`}
      />

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
      {lastAction && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 520 }}>
          {lastAction}
        </Typography>
      )}
    </Box>
  )
}
