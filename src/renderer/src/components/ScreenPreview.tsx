import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { snapToGrid } from '@shared/grid'
import type { WindowInfo } from '@shared/types'
import { CANVAS, HAIRLINE, MONO_FONT } from '../theme'
import { useWindowStream } from '../hooks/useWindowStream'
import PreviewGrid from './PreviewGrid'
import WindowSelect from './WindowSelect'
import TogglePill from './TogglePill'
import { AlertIcon, GridIcon, MonitorIcon } from './icons'

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
  return { x: snapToGrid(x, width), y: snapToGrid(y, height) }
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
          height: 44,
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
        {/* 网格只影响预览，发给模型的截图始终带网格；蓝色留给目标窗口，这里保持无彩色 */}
        <TogglePill
          checked={gridVisible}
          onChange={onGridVisibleChange}
          ghost
          label="网格"
          title="预览网格；发给模型的截图始终带网格"
        >
          <GridIcon />
        </TogglePill>
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
          <PreviewNotice
            tone="empty"
            title="还没有选择窗口"
            hint="从左上角选择一个窗口，画面会实时出现在这里"
          >
            <MonitorIcon />
          </PreviewNotice>
        ) : error ? (
          <PreviewNotice tone="error" title="预览不可用" hint={error}>
            <AlertIcon />
          </PreviewNotice>
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

interface NoticeProps {
  tone: 'empty' | 'error'
  title: string
  hint: string
  children: ReactNode
}

/** 预览区的空态与错误态：圆底图标 + 标题 + 说明，不再用带边框的小卡片 */
function PreviewNotice({ tone, title, hint, children }: NoticeProps) {
  const failed = tone === 'error'
  return (
    <Box sx={{ textAlign: 'center', maxWidth: 340, px: 3 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bgcolor: failed ? 'rgba(207, 46, 46, 0.08)' : 'rgba(15, 23, 42, 0.05)',
          color: failed ? 'error.main' : 'text.disabled',
        }}
      >
        {children}
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: 12.5, fontWeight: 500 }}>{title}</Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.5, color: 'text.secondary', lineHeight: 1.7 }}
      >
        {hint}
      </Typography>
    </Box>
  )
}
