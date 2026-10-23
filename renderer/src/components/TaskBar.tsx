import { useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import type { TokenUsage } from '@shared/agent'
import type { AgentRunState } from '../hooks/useAgentRun'
import { MONO_FONT } from '../theme'

interface Props {
  windowSelected: boolean
  state: AgentRunState
  onStart: (task: string) => Promise<void>
  onStop: () => void
}

function formatTokens(usage: TokenUsage): string {
  const total = usage.prompt + usage.completion
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)
}

export default function TaskBar({ windowSelected, state, onStart, onStop }: Props) {
  const [task, setTask] = useState('')
  // 主进程的 started 事件回来前按钮仍可点，用本地标记挡住重复提交
  const [submitting, setSubmitting] = useState(false)
  const running = state.status !== 'idle'
  const canStart = windowSelected && task.trim().length > 0 && !running && state.configReady

  const start = async () => {
    if (!canStart || submitting) return
    setSubmitting(true)
    try {
      await onStart(task.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ p: 1.5, flex: 'none', borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        任务
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        placeholder="例如：在计算器里算出 12×34"
        value={task}
        onChange={(event) => setTask(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void start()
        }}
        disabled={running}
        sx={{
          mt: 0.5,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#f6f7f9',
            fontSize: 13,
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: '#d4d7dd' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO_FONT }}>
          {state.step}/{state.maxSteps} 步 · {formatTokens(state.usage)} tokens
        </Typography>
        <Box sx={{ flex: 1 }} />
        {running ? (
          <Button
            color="error"
            variant="outlined"
            disabled={state.status === 'stopping'}
            onClick={onStop}
          >
            {state.status === 'stopping' ? '停止中…' : '停止'}
          </Button>
        ) : (
          <Button variant="contained" disabled={!canStart || submitting} onClick={() => void start()}>
            开始
          </Button>
        )}
      </Stack>
      {!state.configReady && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.main' }}>
          未配置 DEEPSEEK_API_KEY，请先填写 .env
        </Typography>
      )}
      {state.error && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'error.main' }}>
          {state.error}
        </Typography>
      )}
    </Box>
  )
}
