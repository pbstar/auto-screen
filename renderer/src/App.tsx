import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AppBar, Box, Button, Toolbar, Typography } from '@mui/material'
import type {
  CaptureResult,
  IpcResult,
  MouseButton,
  PermissionStatus,
  ScrollDirection,
  ToolContext,
  WindowInfo,
} from '@shared/types'
import WindowSelect from './components/WindowSelect'
import ScreenPreview from './components/ScreenPreview'
import type { DragRange, ImagePoint } from './components/preview-types'
import ActionPanel from './components/ActionPanel'
import PanelTabs from './components/PanelTabs'
import TaskBar from './components/TaskBar'
import Timeline from './components/Timeline'
import StatusBar from './components/StatusBar'
import { useAgentRun } from './hooks/useAgentRun'

const api = window.autoScreen

async function expectResult<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function App() {
  const [windows, setWindows] = useState<WindowInfo[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [capture, setCapture] = useState<CaptureResult | null>(null)
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null)
  const [picked, setPicked] = useState<ImagePoint | null>(null)
  const [dragRange, setDragRange] = useState<DragRange | null>(null)
  const [gridVisible, setGridVisible] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastAction, setLastAction] = useState('')
  const captureSeq = useRef(0)
  const agent = useAgentRun()

  const selectedWindow = useMemo(
    () => windows.find((win) => win.id === selectedId) ?? null,
    [windows, selectedId],
  )

  const loadWindows = useCallback(async () => {
    try {
      const data = await expectResult(api.listWindows())
      setWindows(data)
      setSelectedId((previous) => {
        if (previous != null && data.some((win) => win.id === previous)) return previous
        return data[0]?.id ?? null
      })
      setError('')
    } catch (caught) {
      setError(messageOf(caught))
    }
  }, [])

  const refreshCapture = useCallback(async (windowId: number) => {
    const seq = ++captureSeq.current
    setBusy(true)
    try {
      const data = await expectResult(api.capture(windowId))
      if (seq !== captureSeq.current) return
      setCapture(data)
      setPicked(null)
      setDragRange(null)
      setError('')
    } catch (caught) {
      if (seq !== captureSeq.current) return
      setCapture(null)
      setError(messageOf(caught))
    } finally {
      if (seq === captureSeq.current) setBusy(false)
    }
  }, [])

  useEffect(() => {
    void loadWindows()
    void (async () => {
      try {
        setPermissions(await expectResult(api.permissions()))
      } catch (caught) {
        setError(messageOf(caught))
      }
    })()
  }, [loadWindows])

  useEffect(() => {
    if (selectedId == null) {
      setCapture(null)
      return
    }
    void refreshCapture(selectedId)
  }, [selectedId, refreshCapture])

  const buildToolContext = (): ToolContext | null => {
    if (!capture) return null
    return {
      windowId: capture.window.id,
      imageWidth: capture.width,
      imageHeight: capture.height,
      unitMode: 'auto',
    }
  }

  const runAction = async (task: () => Promise<string>) => {
    setBusy(true)
    setError('')
    try {
      setLastAction(await task())
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setBusy(false)
    }
  }

  const handleClick = (button: MouseButton, count: number) => {
    void runAction(async () => {
      const context = buildToolContext()
      if (!context || !picked) throw new Error('请先在预览图上取点')
      const result = await expectResult(
        api.executeTool({
          name: 'click',
          input: { x: picked.x, y: picked.y, button, count },
          context,
          hideWindow: true,
        }),
      )
      return result.text
    })
  }

  const handleDragPick = (range: DragRange) => {
    setDragRange(range)
    setPicked(range.start)
  }

  const clearSelection = () => {
    setPicked(null)
    setDragRange(null)
  }

  const handleDrag = () => {
    void runAction(async () => {
      const context = buildToolContext()
      if (!context || !dragRange) throw new Error('请先在预览图上拖出拖拽范围')
      const result = await expectResult(
        api.executeTool({
          name: 'drag',
          input: {
            fromX: dragRange.start.x,
            fromY: dragRange.start.y,
            toX: dragRange.end.x,
            toY: dragRange.end.y,
          },
          context,
          hideWindow: true,
        }),
      )
      return result.text
    })
  }

  const handleScroll = (direction: ScrollDirection) => {
    void runAction(async () => {
      const context = buildToolContext()
      if (!context || !picked) throw new Error('请先在预览图上取点')
      const result = await expectResult(
        api.executeTool({
          name: 'scroll',
          input: { x: picked.x, y: picked.y, direction, amount: 3 },
          context,
          hideWindow: true,
        }),
      )
      return result.text
    })
  }

  const permissionWarning =
    permissions?.platform === 'darwin' &&
    (permissions.screen !== 'granted' || !permissions.accessibility)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar variant="dense" sx={{ gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Auto Screen
          </Typography>
          <WindowSelect windows={windows} selectedId={selectedId} onSelect={setSelectedId} />
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => void loadWindows()}>刷新窗口</Button>
          <Button
            variant="outlined"
            disabled={selectedId == null || busy}
            onClick={() => selectedId != null && void refreshCapture(selectedId)}
          >
            截图
          </Button>
        </Toolbar>
      </AppBar>

      {permissionWarning && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          需要「屏幕录制」和「辅助功能」权限。请到 系统设置 → 隐私与安全性 中授权，然后重启本应用。
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <ScreenPreview
            capture={capture}
            gridVisible={gridVisible}
            picked={picked}
            dragRange={dragRange}
            onPick={setPicked}
            onDragPick={handleDragPick}
            onGridVisibleChange={setGridVisible}
          />
        </Box>

        <Box
          sx={{
            width: 340,
            flex: 'none',
            borderLeft: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <TaskBar
            windowSelected={selectedId != null}
            state={agent.state}
            onStart={(task) => {
              if (selectedId != null) void agent.start(selectedId, task)
            }}
            onStop={() => void agent.stop()}
          />
          <PanelTabs
            timeline={<Timeline items={agent.state.items} />}
            manual={
              <ActionPanel
                capture={capture}
                picked={picked}
                dragRange={dragRange}
                onPickedChange={setPicked}
                onClear={clearSelection}
                busy={busy}
                onClick={handleClick}
                onDrag={handleDrag}
                onScroll={handleScroll}
              />
            }
          />
        </Box>
      </Box>

      <StatusBar
        permissions={permissions}
        capture={capture}
        selectedWindow={selectedWindow}
        lastAction={lastAction}
        agent={agent.state}
      />
    </Box>
  )
}
