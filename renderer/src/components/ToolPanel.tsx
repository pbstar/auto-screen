import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import { MONO_FONT } from '../theme'
import ToolList from './ToolList'

const api = window.autoScreen

/** 工具清单只是参考，默认收起，把高度留给时间线；展开高度够看全 8 个工具 */
export default function ToolPanel() {
  const [collapsed, setCollapsed] = useState(true)
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void api.listTools().then((result) => {
      if (result.ok) setTools(result.data)
      else setError(result.error)
    })
  }, [])

  return (
    <Box sx={{ flex: 'none', borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 32, px: 1.5 }}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>工具</Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: 11, color: 'text.disabled' }}>
          {tools.length}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          color="inherit"
          onClick={() => setCollapsed((value) => !value)}
          sx={{ minWidth: 0, px: 1, mr: -1, fontSize: 11, color: 'text.secondary' }}
        >
          {collapsed ? '展开' : '收起'}
        </Button>
      </Box>
      {!collapsed && (
        <Box sx={{ height: 160, overflowY: 'auto', px: 1.5, pb: 1 }}>
          <ToolList tools={tools} error={error} />
        </Box>
      )}
    </Box>
  )
}
