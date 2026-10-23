import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box } from '@mui/material'
import type { IpcResult, PermissionStatus, WindowInfo } from '@shared/types'
import TopBar from './components/TopBar'
import ScreenPreview from './components/ScreenPreview'
import TaskBar from './components/TaskBar'
import Timeline from './components/Timeline'
import ReferencePanel from './components/ReferencePanel'
import StatusBar from './components/StatusBar'
import LogDialog from './components/LogDialog'
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
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null)
  const [gridVisible, setGridVisible] = useState(true)
  const [logOpen, setLogOpen] = useState(false)
  const [error, setError] = useState('')
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

  const permissionWarning =
    permissions?.platform === 'darwin' &&
    (permissions.screen !== 'granted' || !permissions.accessibility)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        windows={windows}
        selectedId={selectedId}
        windowLocked={agent.state.status !== 'idle'}
        onSelect={setSelectedId}
        onRefreshWindows={() => void loadWindows()}
        onOpenLogs={() => setLogOpen(true)}
      />

      {permissionWarning && (
        <Alert severity="warning" square sx={{ py: 0.25 }}>
          需要「屏幕录制」和「辅助功能」权限。请到 系统设置 → 隐私与安全性 中授权，然后重启本应用。
        </Alert>
      )}

      {error && (
        <Alert severity="error" square sx={{ py: 0.25 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ScreenPreview
          windowId={selectedId}
          gridVisible={gridVisible}
          onGridVisibleChange={setGridVisible}
        />

        <Box
          sx={{
            width: 380,
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
            onStart={async (task) => {
              if (selectedId == null) return
              await agent.start(selectedId, task)
            }}
            onStop={() => void agent.stop()}
          />
          <Timeline items={agent.state.items} runId={agent.state.runId} />
          <ReferencePanel />
        </Box>
      </Box>

      <StatusBar
        permissions={permissions}
        selectedWindow={selectedWindow}
        agent={agent.state}
      />

      <LogDialog open={logOpen} onClose={() => setLogOpen(false)} />
    </Box>
  )
}
