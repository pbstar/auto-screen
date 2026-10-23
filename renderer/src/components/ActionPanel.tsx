import { useEffect, useState } from 'react'
import { Box, Button, Divider, Stack, TextField, Typography } from '@mui/material'
import type { CaptureResult, MouseButton, ScrollDirection } from '@shared/types'
import { GRID } from '@shared/ipc'
import type { DragRange, ImagePoint } from './preview-types'

interface Props {
  capture: CaptureResult | null
  picked: ImagePoint | null
  dragRange: DragRange | null
  onPickedChange: (point: ImagePoint | null) => void
  onClear: () => void
  busy: boolean
  onClick: (button: MouseButton, count: number) => void
  onDrag: () => void
  onScroll: (direction: ScrollDirection) => void
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(0, value), Math.max(0, max))
}

export default function ActionPanel({
  capture,
  picked,
  dragRange,
  onPickedChange,
  onClear,
  busy,
  onClick,
  onDrag,
  onScroll,
}: Props) {
  const [x, setX] = useState('')
  const [y, setY] = useState('')

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
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2">坐标</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClear} disabled={!picked && !dragRange}>
          清除
        </Button>
      </Stack>

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
      </Stack>

      <Stack direction="row" spacing={1}>
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

      <Typography variant="subtitle2">拖拽</Typography>
      {dragRange ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            ({dragRange.start.x}, {dragRange.start.y}) → ({dragRange.end.x}, {dragRange.end.y})
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" disabled={busy} onClick={onDrag}>
            执行
          </Button>
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">
          在预览图上按住拖动框选
        </Typography>
      )}

      <Divider />

      <Typography variant="subtitle2">滚轮</Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" disabled={!picked || busy} onClick={() => onScroll('up')}>
          向上滚
        </Button>
        <Button variant="outlined" disabled={!picked || busy} onClick={() => onScroll('down')}>
          向下滚
        </Button>
      </Stack>
    </Stack>
  )
}
