import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, FormControlLabel, Switch, Typography } from '@mui/material'
import type { CaptureResult } from '@shared/types'
import { GRID } from '@shared/ipc'
import PreviewGrid from './PreviewGrid'
import PreviewMarkers from './PreviewMarkers'
import type { DragRange, ImagePoint } from './preview-types'

const DRAG_THRESHOLD = 6

interface Props {
  capture: CaptureResult | null
  gridVisible: boolean
  picked: ImagePoint | null
  dragRange: DragRange | null
  onPick: (point: ImagePoint) => void
  onDragPick: (range: DragRange) => void
  onGridVisibleChange: (value: boolean) => void
}

interface PointEvent {
  clientX: number
  clientY: number
  currentTarget: HTMLDivElement
}

function snapPoint(x: number, y: number, width: number, height: number): ImagePoint {
  const snap = (value: number, limit: number) =>
    Math.min(limit, Math.max(0, Math.round(value / GRID.minor) * GRID.minor))
  return { x: snap(x, width), y: snap(y, height) }
}

export default function ScreenPreview({
  capture,
  gridVisible,
  picked,
  dragRange,
  onPick,
  onDragPick,
  onGridVisibleChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<ImagePoint | null>(null)
  const [gesture, setGesture] = useState<{
    start: ImagePoint
    current: ImagePoint
    startClientX: number
    startClientY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setBox({ width: rect.width, height: rect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const layout = useMemo(() => {
    if (!capture || box.width <= 0 || box.height <= 0) return null
    const scale = Math.min(box.width / capture.width, box.height / capture.height, 1)
    const displayWidth = Math.max(1, Math.floor(capture.width * scale))
    const displayHeight = Math.max(1, Math.floor(capture.height * scale))
    return { displayWidth, displayHeight }
  }, [capture, box])

  const toPoint = (event: PointEvent): ImagePoint | null => {
    if (!capture) return null
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * capture.width
    const y = ((event.clientY - rect.top) / rect.height) * capture.height
    return snapPoint(x, y, capture.width, capture.height)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const point = toPoint(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setGesture({
      start: point,
      current: point,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = toPoint(event)
    if (!point) return
    if (gesture) {
      const moved =
        gesture.moved ||
        Math.hypot(event.clientX - gesture.startClientX, event.clientY - gesture.startClientY) >=
          DRAG_THRESHOLD
      setGesture({ ...gesture, current: point, moved })
      return
    }
    setHover(point)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!gesture) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const point = toPoint(event) ?? gesture.current
    const moved =
      gesture.moved ||
      Math.hypot(event.clientX - gesture.startClientX, event.clientY - gesture.startClientY) >=
        DRAG_THRESHOLD
    const start = gesture.start
    setGesture(null)

    if (moved) {
      onDragPick({ start, end: point })
      return
    }
    onPick(point)
    void window.autoScreen.copyText(`${point.x}, ${point.y}`)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={gridVisible}
              onChange={(event) => onGridVisibleChange(event.target.checked)}
            />
          }
          label="网格"
        />
        <Typography
          variant="body2"
          sx={{ ml: 'auto', fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
        >
          {gesture?.moved
            ? `拖拽 ${gesture.start.x}, ${gesture.start.y} → ${gesture.current.x}, ${gesture.current.y}`
            : `坐标 ${hover ? `${hover.x}, ${hover.y}` : '—'}${
                picked ? ` ｜ 取点 ${picked.x}, ${picked.y}` : ''
              }`}
        </Typography>
      </Box>

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0f0f0f',
          p: 1.5,
          overflow: 'hidden',
        }}
      >
        {!capture || !layout ? (
          <Typography color="text.secondary">在顶栏选择目标窗口后开始截屏</Typography>
        ) : (
          <Box
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setGesture(null)}
            onPointerLeave={() => {
              if (!gesture) setHover(null)
            }}
            sx={{
              position: 'relative',
              width: layout.displayWidth,
              height: layout.displayHeight,
              cursor: 'crosshair',
              outline: '1px solid rgba(255,255,255,0.18)',
              flex: 'none',
              touchAction: 'none',
            }}
          >
            <img
              src={capture.image}
              alt="目标窗口截图"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                userSelect: 'none',
              }}
            />

            <svg
              width={layout.displayWidth}
              height={layout.displayHeight}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              <PreviewGrid
                imageWidth={capture.width}
                imageHeight={capture.height}
                displayWidth={layout.displayWidth}
                displayHeight={layout.displayHeight}
                visible={gridVisible}
              />
              <PreviewMarkers
                picked={picked}
                dragRange={gesture?.moved ? { start: gesture.start, end: gesture.current } : dragRange}
                imageWidth={capture.width}
                imageHeight={capture.height}
                displayWidth={layout.displayWidth}
                displayHeight={layout.displayHeight}
              />
            </svg>
          </Box>
        )}
      </Box>
    </Box>
  )
}
