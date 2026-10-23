import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import type { CaptureResult } from '@shared/types'
import { GRID } from '@shared/ipc'

export interface ImagePoint {
  x: number
  y: number
}

interface Props {
  capture: CaptureResult | null
  gridVisible: boolean
  pickMode: boolean
  autoRefresh: boolean
  picked: ImagePoint | null
  busy: boolean
  onPick: (point: ImagePoint) => void
  onGridVisibleChange: (value: boolean) => void
  onPickModeChange: (value: boolean) => void
  onAutoRefreshChange: (value: boolean) => void
  onRefresh: () => void
}

function snapPoint(x: number, y: number, width: number, height: number): ImagePoint {
  const snap = (value: number, limit: number) =>
    Math.min(limit, Math.max(0, Math.round(value / GRID.minor) * GRID.minor))
  return { x: snap(x, width), y: snap(y, height) }
}

export default function ScreenPreview({
  capture,
  gridVisible,
  pickMode,
  autoRefresh,
  picked,
  busy,
  onPick,
  onGridVisibleChange,
  onPickModeChange,
  onAutoRefreshChange,
  onRefresh,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<ImagePoint | null>(null)

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
    return { scale, displayWidth, displayHeight }
  }, [capture, box])

  const toPoint = (event: React.MouseEvent<HTMLDivElement>): ImagePoint | null => {
    if (!capture) return null
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * capture.width
    const y = ((event.clientY - rect.top) / rect.height) * capture.height
    return snapPoint(x, y, capture.width, capture.height)
  }

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setHover(toPoint(event))
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!pickMode) return
    const point = toPoint(event)
    if (!point) return
    onPick(point)
    void window.autoScreen.copyText(`${point.x}, ${point.y}`)
  }

  const displayX = (x: number) => (x / (capture?.width ?? 1)) * (layout?.displayWidth ?? 1)
  const displayY = (y: number) => (y / (capture?.height ?? 1)) * (layout?.displayHeight ?? 1)

  const majorX = useMemo(() => {
    if (!capture) return [] as number[]
    const values: number[] = []
    for (let x = 0; x <= capture.width; x += GRID.major) values.push(x)
    return values
  }, [capture])

  const majorY = useMemo(() => {
    if (!capture) return [] as number[]
    const values: number[] = []
    for (let y = 0; y <= capture.height; y += GRID.major) values.push(y)
    return values
  }, [capture])

  const minorTicksX = useMemo(() => {
    if (!capture || !layout) return [] as number[]
    if (GRID.minor * layout.scale < 4) return [] as number[]
    const values: number[] = []
    for (let x = 0; x <= capture.width; x += GRID.minor) values.push(x)
    return values
  }, [capture, layout])

  const minorTicksY = useMemo(() => {
    if (!capture || !layout) return [] as number[]
    if (GRID.minor * layout.scale < 4) return [] as number[]
    const values: number[] = []
    for (let y = 0; y <= capture.height; y += GRID.minor) values.push(y)
    return values
  }, [capture, layout])

  const majorStepPx = layout ? GRID.major * layout.scale : 0
  const showLabels = majorStepPx >= 24

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
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
          label="网格 10/100px"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={pickMode}
              onChange={(event) => onPickModeChange(event.target.checked)}
            />
          }
          label="取点模式"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={autoRefresh}
              onChange={(event) => onAutoRefreshChange(event.target.checked)}
            />
          }
          label="自动刷新"
        />
        <Button variant="text" onClick={onRefresh} disabled={!capture || busy}>
          刷新截图
        </Button>
        <Typography
          variant="body2"
          sx={{ ml: 'auto', fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
        >
          鼠标坐标 {hover ? `${hover.x}, ${hover.y}` : '—'}
          {picked ? ` ｜ 取点 ${picked.x}, ${picked.y}` : ''}
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
          <Typography color="text.secondary">选择左侧窗口后开始截屏</Typography>
        ) : (
          <Box
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
            onClick={handleClick}
            sx={{
              position: 'relative',
              width: layout.displayWidth,
              height: layout.displayHeight,
              cursor: pickMode ? 'crosshair' : 'default',
              outline: '1px solid rgba(255,255,255,0.18)',
              flex: 'none',
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
              {gridVisible && (
                <g>
                  {majorX.map((x) => (
                    <line
                      key={`vx-${x}`}
                      x1={displayX(x)}
                      y1={0}
                      x2={displayX(x)}
                      y2={layout.displayHeight}
                      stroke="rgba(255,82,82,0.45)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ))}
                  {majorY.map((y) => (
                    <line
                      key={`hy-${y}`}
                      x1={0}
                      y1={displayY(y)}
                      x2={layout.displayWidth}
                      y2={displayY(y)}
                      stroke="rgba(255,82,82,0.45)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ))}

                  {minorTicksX.map((x) => (
                    <line
                      key={`tx-${x}`}
                      x1={displayX(x)}
                      y1={0}
                      x2={displayX(x)}
                      y2={x % GRID.major === 0 ? 10 : 4}
                      stroke="rgba(255,82,82,0.7)"
                      strokeWidth={1}
                    />
                  ))}
                  {minorTicksY.map((y) => (
                    <line
                      key={`ty-${y}`}
                      x1={0}
                      y1={displayY(y)}
                      x2={y % GRID.major === 0 ? 10 : 4}
                      y2={displayY(y)}
                      stroke="rgba(255,82,82,0.7)"
                      strokeWidth={1}
                    />
                  ))}

                  {showLabels &&
                    majorX.map((x) => (
                      <text
                        key={`lx-${x}`}
                        x={displayX(x) + 3}
                        y={14}
                        fontSize={11}
                        fill="#ff8a80"
                        stroke="rgba(0,0,0,0.85)"
                        strokeWidth={3}
                        paintOrder="stroke"
                      >
                        {x}
                      </text>
                    ))}
                  {showLabels &&
                    majorY.map((y) => (
                      <text
                        key={`ly-${y}`}
                        x={3}
                        y={displayY(y) - 3}
                        fontSize={11}
                        fill="#ff8a80"
                        stroke="rgba(0,0,0,0.85)"
                        strokeWidth={3}
                        paintOrder="stroke"
                      >
                        {y}
                      </text>
                    ))}
                </g>
              )}

              {picked && (
                <g>
                  <circle
                    cx={displayX(picked.x)}
                    cy={displayY(picked.y)}
                    r={7}
                    fill="none"
                    stroke="#ff1744"
                    strokeWidth={2}
                  />
                  <line
                    x1={displayX(picked.x) - 12}
                    y1={displayY(picked.y)}
                    x2={displayX(picked.x) + 12}
                    y2={displayY(picked.y)}
                    stroke="#ff1744"
                    strokeWidth={1}
                  />
                  <line
                    x1={displayX(picked.x)}
                    y1={displayY(picked.y) - 12}
                    x2={displayX(picked.x)}
                    y2={displayY(picked.y) + 12}
                    stroke="#ff1744"
                    strokeWidth={1}
                  />
                </g>
              )}
            </svg>
          </Box>
        )}
      </Box>
    </Box>
  )
}
