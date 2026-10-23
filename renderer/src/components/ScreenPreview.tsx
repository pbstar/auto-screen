import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, FormControlLabel, Switch, Typography } from '@mui/material'
import type { CaptureResult } from '@shared/types'
import { GRID } from '@shared/ipc'
import { MONO_FONT } from '../theme'
import PreviewGrid from './PreviewGrid'

interface Props {
  capture: CaptureResult | null
  gridVisible: boolean
  onGridVisibleChange: (value: boolean) => void
}

interface Point {
  x: number
  y: number
}

function snapPoint(x: number, y: number, width: number, height: number): Point {
  const snap = (value: number, limit: number) =>
    Math.min(limit, Math.max(0, Math.round(value / GRID.minor) * GRID.minor))
  return { x: snap(x, width), y: snap(y, height) }
}

export default function ScreenPreview({ capture, gridVisible, onGridVisibleChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<Point | null>(null)

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
    return {
      scale,
      displayWidth: Math.max(1, Math.floor(capture.width * scale)),
      displayHeight: Math.max(1, Math.floor(capture.height * scale)),
    }
  }, [capture, box])

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!capture) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * capture.width
    const y = ((event.clientY - rect.top) / rect.height) * capture.height
    setHover(snapPoint(x, y, capture.width, capture.height))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 36,
          px: 1.5,
          flex: 'none',
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
          label={<Typography variant="caption">网格</Typography>}
          sx={{ mr: 0 }}
        />
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO_FONT }}>
          {capture ? `${capture.width}×${capture.height}` : '—'}
          {layout ? ` · ${Math.round(layout.scale * 100)}%` : ''}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontFamily: MONO_FONT, minWidth: 96, textAlign: 'right' }}
        >
          {hover ? `${hover.x}, ${hover.y}` : '—, —'}
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
          bgcolor: '#f6f7f9',
          p: 2,
          overflow: 'hidden',
        }}
      >
        {!capture || !layout ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            在顶栏选择目标窗口后开始截屏
          </Typography>
        ) : (
          <Box
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
            sx={{
              position: 'relative',
              width: layout.displayWidth,
              height: layout.displayHeight,
              flex: 'none',
              borderRadius: '4px',
              outline: '1px solid #e6e8eb',
              overflow: 'hidden',
            }}
          >
            <img
              src={capture.image}
              alt="目标窗口截图"
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }}
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
            </svg>
          </Box>
        )}
      </Box>
    </Box>
  )
}
