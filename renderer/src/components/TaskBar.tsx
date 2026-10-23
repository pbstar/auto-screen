import { useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import type { TokenUsage } from '@shared/agent'
import type { AgentRunState } from '../hooks/useAgentRun'

interface Props {
  windowSelected: boolean
  state: AgentRunState
  onStart: (task: string) => void
  onStop: () => void
}

function formatTokens(usage: TokenUsage): string {
  const total = usage.prompt + usage.completion
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)
}

export default function TaskBar({ windowSelected, state, onStart, onStop }: Props) {
  const [task, setTask] = useState('')
  const running = state.status !== 'idle'
  const canStart = windowSelected && task.trim().length > 0 && !running && state.configReady

  const start = () => {
    if (canStart) onStart(task.trim())
  }

  return (
    <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        placeholder="例如：在计算器里算出 12×34"
        value={task}
        onChange={(event) => setTask(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) start()
        }}
        disabled={running}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          第 {state.step}/{state.maxSteps} 步 · tokens {formatTokens(state.usage)}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {running ? (
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={state.status === 'stopping'}
            onClick={onStop}
          >
            {state.status === 'stopping' ? '停止中…' : '停止'}
          </Button>
        ) : (
          <Button size="small" variant="contained" disabled={!canStart} onClick={start}>
            开始
          </Button>
        )}
      </Stack>
      {!state.configReady && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
          未配置 DEEPSEEK_API_KEY，请先填写 .env
        </Typography>
      )}
      {state.error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {state.error}
        </Typography>
      )}
    </Box>
  )
}
