import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AppBar, Box, Button, Chip, Toolbar, Typography } from '@mui/material'
import type {
  CaptureResult,
  ClickRequest,
  IpcResult,
  MouseButton,
  PermissionStatus,
  UnitMode,
  WindowInfo,
} from '@shared/types'
import WindowList from './components/WindowList'
import ScreenPreview, { type ImagePoint } from './components/ScreenPreview'
import ActionPanel from './components/ActionPanel'
import StatusBar from './components/StatusBar'

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
  const [gridVisible, setGridVisible] = useState(true)
  const [pickMode, setPickMode] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [hideWindow, setHideWindow] = useState(true)
  const [unitMode, setUnitMode] = useState<UnitMode>('auto')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastAction, setLastAction] = useState('')
  const captureSeq = useRef(0)

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

  const refreshCapture = useCallback(
    async (windowId: number, keepPicked = false, silent = false) => {
      const seq = ++captureSeq.current
      if (!silent) setBusy(true)
      try {
        const data = await expectResult(api.capture(windowId))
        if (seq !== captureSeq.current) return
        setCapture(data)
        if (!keepPicked) setPicked(null)
        setError('')
      } catch (caught) {
        if (seq !== captureSeq.current) return
        setCapture(null)
        setError(messageOf(caught))
      } finally {
        if (!silent && seq === captureSeq.current) setBusy(false)
      }
    },
    [],
  )

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

  useEffect(() => {
    if (!autoRefresh || selectedId == null) return
    const timer = window.setInterval(() => {
      void refreshCapture(selectedId, true, true)
    }, 1500)
    return () => window.clearInterval(timer)
  }, [autoRefresh, selectedId, refreshCapture])

  const buildClickRequest = (): ClickRequest | null => {
    if (!capture || !picked) return null
    return {
      windowId: capture.window.id,
      imageWidth: capture.width,
      imageHeight: capture.height,
      x: picked.x,
      y: picked.y,
      unitMode,
      hideWindow,
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
      const request = buildClickRequest()
      if (!request) throw new Error('请先在预览图上取点')
      const result = await expectResult(api.click({ ...request, button, count }))
      const action = button === 'right' ? '右键' : count > 1 ? '双击' : '单击'
      const unit = result.unit === 'physical' ? '物理像素' : '逻辑点'
      return `已${action} (${result.x.toFixed(1)}, ${result.y.toFixed(1)})，坐标单位：${unit}`
    })
  }

  const handleType = (text: string, useClick: boolean) => {
    void runAction(async () => {
      if (!text) throw new Error('请输入要输入的文本')
      let click: ClickRequest | undefined
      if (useClick) {
        const request = buildClickRequest()
        if (!request) throw new Error('请先在预览图上取点')
        click = request
      }
      await expectResult(api.typeText({ text, click, hideWindow }))
      return click ? `已在 (${click.x}, ${click.y}) 输入 ${text.length} 个字符` : `已输入 ${text.length} 个字符`
    })
  }

  const handleKey = (combo: string) => {
    void runAction(async () => {
      const value = combo.trim()
      if (!value) throw new Error('请输入组合键')
      await expectResult(api.pressKey({ combo: value, hideWindow }))
      return `已发送按键 ${value}`
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
          <Chip
            size="small"
            label={
              selectedWindow
                ? `${selectedWindow.appName} · ${selectedWindow.title || '无标题窗口'}`
                : '未选择窗口'
            }
          />
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => void loadWindows()}>刷新窗口</Button>
          <Button
            variant="outlined"
            disabled={selectedId == null || busy}
            onClick={() => selectedId != null && void refreshCapture(selectedId)}
          >
            重新截图
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
        <Box sx={{ width: 260, flex: 'none', borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          <WindowList windows={windows} selectedId={selectedId} onSelect={setSelectedId} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <ScreenPreview
            capture={capture}
            gridVisible={gridVisible}
            pickMode={pickMode}
            autoRefresh={autoRefresh}
            picked={picked}
            busy={busy}
            onPick={setPicked}
            onGridVisibleChange={setGridVisible}
            onPickModeChange={setPickMode}
            onAutoRefreshChange={setAutoRefresh}
            onRefresh={() => selectedId != null && void refreshCapture(selectedId)}
          />
        </Box>

        <Box
          sx={{
            width: 340,
            flex: 'none',
            borderLeft: 1,
            borderColor: 'divider',
            overflow: 'auto',
            p: 1.5,
          }}
        >
          <ActionPanel
            capture={capture}
            picked={picked}
            onPickedChange={setPicked}
            unitMode={unitMode}
            onUnitModeChange={setUnitMode}
            hideWindow={hideWindow}
            onHideWindowChange={setHideWindow}
            busy={busy}
            lastAction={lastAction}
            onClick={handleClick}
            onType={handleType}
            onKey={handleKey}
          />
        </Box>
      </Box>

      <StatusBar permissions={permissions} capture={capture} selectedWindow={selectedWindow} />
    </Box>
  )
}
