import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { CaptureResult, MouseButton, UnitMode } from '@shared/types'
import { GRID } from '@shared/ipc'
import type { ImagePoint } from './ScreenPreview'

interface Props {
  capture: CaptureResult | null
  picked: ImagePoint | null
  onPickedChange: (point: ImagePoint | null) => void
  unitMode: UnitMode
  onUnitModeChange: (mode: UnitMode) => void
  hideWindow: boolean
  onHideWindowChange: (value: boolean) => void
  busy: boolean
  lastAction: string
  onClick: (button: MouseButton, count: number) => void
  onType: (text: string, useClick: boolean) => void
  onKey: (combo: string) => void
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(0, value), Math.max(0, max))
}

export default function ActionPanel({
  capture,
  picked,
  onPickedChange,
  unitMode,
  onUnitModeChange,
  hideWindow,
  onHideWindowChange,
  busy,
  lastAction,
  onClick,
  onType,
  onKey,
}: Props) {
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [text, setText] = useState('')
  const [combo, setCombo] = useState('')
  const [useClick, setUseClick] = useState(true)

  useEffect(() => {
    setX(picked ? String(picked.x) : '')
    setY(picked ? String(picked.y) : '')
  }, [picked])

  const commitCoordinate = () => {
    if (x.trim() === '' && y.trim() === '') {
      onPickedChange(null)
      return
    }
    const parsedX = Number(x)
    const parsedY = Number(y)
    if (!Number.isFinite(parsedX) || !Number.isFinite(parsedY)) return

    const width = capture?.width ?? Number.MAX_SAFE_INTEGER
    const height = capture?.height ?? Number.MAX_SAFE_INTEGER
    const snappedX = Math.round(parsedX / GRID.minor) * GRID.minor
    const snappedY = Math.round(parsedY / GRID.minor) * GRID.minor
    onPickedChange({ x: clamp(snappedX, width), y: clamp(snappedY, height) })
  }

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2">坐标（10px 网格）</Typography>
        <Typography variant="caption" color="text.secondary">
          {capture ? `截图 ${capture.width}×${capture.height} px` : '尚未截图'}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1}>
        <TextField
          label="X"
          type="number"
          value={x}
          onChange={(event) => setX(event.target.value)}
          onBlur={commitCoordinate}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitCoordinate()
          }}
          slotProps={{ htmlInput: { min: 0, step: GRID.minor } }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Y"
          type="number"
          value={y}
          onChange={(event) => setY(event.target.value)}
          onBlur={commitCoordinate}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitCoordinate()
          }}
          slotProps={{ htmlInput: { min: 0, step: GRID.minor } }}
          sx={{ flex: 1 }}
        />
        <Button onClick={() => onPickedChange(null)} disabled={!picked}>
          清除
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button variant="outlined" disabled={!picked || busy} onClick={() => onClick('left', 1)}>
          单击
        </Button>
        <Button variant="outlined" disabled={!picked || busy} onClick={() => onClick('left', 2)}>
          双击
        </Button>
        <Button variant="outlined" disabled={!picked || busy} onClick={() => onClick('right', 1)}>
          右键
        </Button>
      </Stack>

      <Divider />

      <Typography variant="subtitle2">文本输入</Typography>
      <TextField
        multiline
        minRows={2}
        maxRows={4}
        fullWidth
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="要输入到目标窗口的文本"
      />
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={useClick}
            onChange={(event) => setUseClick(event.target.checked)}
            disabled={!picked}
          />
        }
        label="先点击取点位置"
      />
      <Button
        variant="contained"
        disabled={busy || text.length === 0}
        onClick={() => onType(text, useClick && picked != null)}
      >
        输入文本
      </Button>

      <Divider />

      <Typography variant="subtitle2">按键</Typography>
      <TextField
        fullWidth
        value={combo}
        onChange={(event) => setCombo(event.target.value)}
        placeholder="mod+shift+t"
      />
      <Button variant="contained" disabled={busy || combo.trim().length === 0} onClick={() => onKey(combo)}>
        发送按键
      </Button>

      <Divider />

      <Typography variant="subtitle2">执行设置</Typography>
      <FormControl fullWidth size="small">
        <InputLabel id="unit-mode-label">鼠标坐标单位</InputLabel>
        <Select
          labelId="unit-mode-label"
          label="鼠标坐标单位"
          value={unitMode}
          onChange={(event) => onUnitModeChange(event.target.value as UnitMode)}
        >
          <MenuItem value="auto">自动判断</MenuItem>
          <MenuItem value="physical">物理像素</MenuItem>
          <MenuItem value="logical">逻辑点</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="caption" color="text.secondary">
        点击位置整体偏移（通常是 2 倍）时，在这里切换单位。
      </Typography>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={hideWindow}
            onChange={(event) => onHideWindowChange(event.target.checked)}
          />
        }
        label="执行时暂时隐藏本窗口"
      />

      <Divider />

      <Typography variant="caption" color="text.secondary">
        {lastAction || '尚未执行操作'}
      </Typography>
    </Stack>
  )
}
