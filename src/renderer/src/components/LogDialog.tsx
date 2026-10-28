import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  Typography,
} from '@mui/material'
import type { RunMeta } from '@shared/types'
import { dateTimeText } from '@shared/time'
import { CANVAS, monoText } from '../theme'

const api = window.autoScreen

interface Props {
  open: boolean
  onClose: () => void
}

const REASON_TEXT: Record<string, string> = {
  completed: '完成',
  stopped: '已停止',
  max_steps: '超步数',
  failed: '失败',
  unverified: '未通过核对',
}

export default function LogDialog({ open, onClose }: Props) {
  const [runs, setRuns] = useState<RunMeta[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const loadRuns = useCallback(async () => {
    const result = await api.listRuns()
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setRuns(result.data)
    setSelected((previous) =>
      previous && result.data.some((run) => run.name === previous)
        ? previous
        : (result.data[0]?.name ?? null),
    )
  }, [])

  useEffect(() => {
    if (open) void loadRuns()
  }, [open, loadRuns])

  useEffect(() => {
    if (!open || !selected) {
      setText('')
      return
    }
    void (async () => {
      const result = await api.readRun(selected)
      setText(result.ok ? result.data.text : `读取失败：${result.error}`)
    })()
  }, [open, selected])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 600, py: 1.5 }}>
        运行日志
        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
          每次运行一个目录，含 run.log 与每步截图
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', gap: 1.5, height: '62vh', pt: '8px !important' }}>
        <RunList runs={runs} selected={selected} onSelect={setSelected} error={error} />
        <LogText text={text} />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={() => void api.openRunsDir()}>打开目录</Button>
        <Button variant="contained" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface RunListProps {
  runs: RunMeta[]
  selected: string | null
  onSelect: (name: string) => void
  error: string
}

function RunList({ runs, selected, onSelect, error }: RunListProps) {
  return (
    <Box
      sx={{
        width: 180,
        flex: 'none',
        overflowY: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: '6px',
      }}
    >
      {error && (
        <Typography variant="caption" sx={{ display: 'block', p: 1, color: 'error.main' }}>
          {error}
        </Typography>
      )}
      {!error && runs.length === 0 && (
        <Typography variant="caption" sx={{ display: 'block', p: 1, color: 'text.secondary' }}>
          还没有运行记录
        </Typography>
      )}
      <List dense disablePadding>
        {runs.map((run) => (
          <ListItemButton
            key={run.name}
            selected={run.name === selected}
            onClick={() => onSelect(run.name)}
            sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 0.75, px: 1 }}
          >
            <Typography variant="caption" sx={monoText(11)}>
              {dateTimeText(run.startedAt)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', maxWidth: 150 }}
              noWrap
            >
              {run.task || '（未记录任务）'}
              {run.reason ? ` · ${REASON_TEXT[run.reason] ?? run.reason}` : ''}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
}

function LogText({ text }: { text: string }) {
  return (
    <Box
      component="pre"
      sx={{
        flex: 1,
        minWidth: 0,
        m: 0,
        p: 1.25,
        overflow: 'auto',
        bgcolor: CANVAS,
        borderRadius: '6px',
        ...monoText(11.5),
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text || '选择左侧一条记录查看日志'}
    </Box>
  )
}
