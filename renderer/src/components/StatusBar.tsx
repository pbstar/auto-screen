import { Box, Typography } from '@mui/material'
import type { PermissionStatus, WindowInfo } from '@shared/types'
import type { AgentRunState } from '../hooks/useAgentRun'
import { MONO_FONT } from '../theme'

interface Props {
  permissions: PermissionStatus | null
  selectedWindow: WindowInfo | null
  agent: AgentRunState
}

const AGENT_LABELS: Record<AgentRunState['status'], string> = {
  idle: '空闲',
  running: '运行中',
  paused: '已暂停',
  stopping: '停止中',
}

function permissionSummary(permissions: PermissionStatus | null): { ok: boolean; text: string } {
  if (!permissions) return { ok: false, text: '权限未知' }
  if (permissions.platform !== 'darwin') return { ok: true, text: '无需额外授权' }
  const screenOk = permissions.screen === 'granted'
  const text = `屏幕录制 ${screenOk ? '✓' : '✕'} · 辅助功能 ${permissions.accessibility ? '✓' : '✕'}`
  return { ok: screenOk && permissions.accessibility, text }
}

function formatTokens(agent: AgentRunState): string {
  const total = agent.usage.prompt + agent.usage.completion
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)
}

export default function StatusBar({ permissions, selectedWindow, agent }: Props) {
  const permission = permissionSummary(permissions)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        height: 28,
        px: 2,
        flex: 'none',
        borderTop: 1,
        borderColor: 'divider',
        color: 'text.secondary',
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: permission.ok ? 'success.main' : 'warning.main',
        }}
      />
      <Typography variant="caption">{permission.text}</Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        |
      </Typography>
      <Typography variant="caption">
        Agent {AGENT_LABELS[agent.status]} · {agent.step}/{agent.maxSteps} 步 ·{' '}
        {formatTokens(agent)} tokens
      </Typography>
      <Box sx={{ flex: 1 }} />
      {selectedWindow && (
        <Typography variant="caption" sx={{ fontFamily: MONO_FONT }}>
          窗口 {selectedWindow.width}×{selectedWindow.height}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        M2
      </Typography>
    </Box>
  )
}
