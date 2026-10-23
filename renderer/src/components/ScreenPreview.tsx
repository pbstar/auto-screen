import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, FormControlLabel, Switch, Typography } from '@mui/material'
import { GRID } from '@shared/ipc'
import { MONO_FONT } from '../theme'
import { useWindowStream } from '../hooks/useWindowStream'
import PreviewGrid from './PreviewGrid'

interface Props {
  windowId: number | null
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

export default function ScreenPreview({ windowId, gridVisible, onGridVisibleChange }: Props) {
  const { videoRef, size, error, syncSize } = useWindowStream(windowId)
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
    if (size.width <= 0 || box.width <= 0 || box.height <= 0) return null
    const scale = Math.min(box.width / size.width, box.height / size.height, 1)
    return {
      scale,
      displayWidth: Math.max(1, Math.floor(size.width * scale)),
      displayHeight: Math.max(1, Math.floor(size.height * scale)),
    }
  }, [size, box])

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (size.width <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * size.width
    const y = ((event.clientY - rect.top) / rect.height) * size.height
    setHover(snapPoint(x, y, size.width, size.height))
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
          {size.width > 0 ? `${size.width}×${size.height}` : '—'}
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
        {windowId == null ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            在顶栏选择目标窗口后开始捕获
          </Typography>
        ) : error ? (
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        ) : (
          <Box
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
            sx={{
              position: 'relative',
              width: layout?.displayWidth ?? 0,
              height: layout?.displayHeight ?? 0,
              flex: 'none',
              borderRadius: '4px',
              outline: layout ? '1px solid #e6e8eb' : 'none',
              overflow: 'hidden',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={syncSize}
              onResize={syncSize}
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
            />
            {layout && (
              <svg
                width={layout.displayWidth}
                height={layout.displayHeight}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                <PreviewGrid
                  imageWidth={size.width}
                  imageHeight={size.height}
                  displayWidth={layout.displayWidth}
                  displayHeight={layout.displayHeight}
                  visible={gridVisible}
                />
              </svg>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
