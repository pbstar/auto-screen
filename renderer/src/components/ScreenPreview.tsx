import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, FormControlLabel, Switch, Typography } from '@mui/material'
import { GRID } from '@shared/ipc'
import type { WindowInfo } from '@shared/types'
import { CANVAS, HAIRLINE, MONO_FONT, SIGNAL } from '../theme'
import { useWindowStream } from '../hooks/useWindowStream'
import PreviewGrid from './PreviewGrid'
import WindowSelect from './WindowSelect'

interface Props {
  windows: WindowInfo[]
  windowId: number | null
  /** 运行中切窗口会让预览与 Agent 指向不同目标，直接禁用 */
  windowLocked: boolean
  onSelect: (id: number) => void
  onRefreshWindows: () => void
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

export default function ScreenPreview({
  windows,
  windowId,
  windowLocked,
  onSelect,
  onRefreshWindows,
  gridVisible,
  onGridVisibleChange,
}: Props) {
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
          gap: 1.5,
          height: 40,
          px: 1.5,
          flex: 'none',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <WindowSelect
          windows={windows}
          selectedId={windowId}
          disabled={windowLocked}
          onSelect={onSelect}
          onOpen={onRefreshWindows}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={gridVisible}
              onChange={(event) => onGridVisibleChange(event.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: SIGNAL },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  bgcolor: SIGNAL,
                  opacity: 1,
                },
              }}
            />
          }
          label={<Typography variant="caption">网格</Typography>}
          // 抵消 Switch 自带的内边距，让开关轨道和上方的窗口选择框左边对齐
          sx={{ mr: 0, ml: -0.875 }}
        />
        <Box sx={{ flex: 1 }} />
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: 11,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {size.width > 0 ? `${size.width}×${size.height}` : '—'}
          {layout ? ` · ${Math.round(layout.scale * 100)}%` : ''}
        </Typography>
        <Box sx={{ width: '1px', height: 14, bgcolor: 'divider', flex: 'none' }} />
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: 11,
            color: hover ? 'text.primary' : 'text.disabled',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 88,
            textAlign: 'right',
          }}
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
          bgcolor: CANVAS,
          // 坐标点阵：和截图上的网格呼应，也把被操作的窗口衬出来
          backgroundImage: 'radial-gradient(circle, #d2d8e1 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          p: 2.5,
          overflow: 'hidden',
        }}
      >
        {windowId == null ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>还没有捕获窗口</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
              从左上角选择一个窗口
              <br />
              画面会实时出现在这里
            </Typography>
          </Box>
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
              borderRadius: '6px',
              boxShadow: layout ? `0 0 0 1px ${HAIRLINE}, 0 12px 32px rgba(15, 23, 42, 0.10)` : 'none',
              overflow: 'hidden',
              bgcolor: '#ffffff',
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
