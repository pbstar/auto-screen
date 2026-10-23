import { useEffect, useState } from 'react'
import { Box, Button } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import ToolList from './ToolList'
import SkillList from './SkillList'

const api = window.autoScreen

type Tab = 'tools' | 'skills'

export default function ReferencePanel() {
  const [tab, setTab] = useState<Tab>('tools')
  const [collapsed, setCollapsed] = useState(false)
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: 34, px: 1.5 }}>
        <TabButton active={tab === 'tools'} onClick={() => setTab('tools')}>
          {tools.length > 0 ? `工具 ${tools.length}` : '工具'}
        </TabButton>
        <TabButton active={tab === 'skills'} onClick={() => setTab('skills')}>
          技能 3
        </TabButton>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          color="inherit"
          onClick={() => setCollapsed((value) => !value)}
          sx={{ minWidth: 0, px: 0.75, color: 'text.secondary' }}
        >
          {collapsed ? '展开' : '收起'}
        </Button>
      </Box>
      {!collapsed && (
        <Box sx={{ height: 150, overflowY: 'auto', px: 1.5, pb: 1 }}>
          {tab === 'tools' ? <ToolList tools={tools} error={error} /> : <SkillList />}
        </Box>
      )}
    </Box>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <Button
      size="small"
      disableRipple
      onClick={onClick}
      sx={{
        minWidth: 0,
        px: 0.75,
        borderRadius: '4px',
        fontWeight: active ? 600 : 500,
        color: active ? 'text.primary' : 'text.secondary',
        bgcolor: active ? '#f0f1f3' : 'transparent',
      }}
    >
      {children}
    </Button>
  )
}
