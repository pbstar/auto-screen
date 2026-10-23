import { useEffect, useState } from 'react'
import { Box, Button } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import { MONO_FONT } from '../theme'
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: 36, px: 1.5 }}>
        <TabButton active={tab === 'tools'} onClick={() => setTab('tools')} label="工具" count={tools.length} />
        <TabButton active={tab === 'skills'} onClick={() => setTab('skills')} label="技能" count={3} />
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
  label: string
  count: number
}

function TabButton({ active, onClick, label, count }: TabButtonProps) {
  return (
    <Button
      size="small"
      disableRipple
      onClick={onClick}
      sx={{
        minWidth: 0,
        px: 1,
        height: 36,
        borderRadius: 0,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        color: active ? 'text.primary' : 'text.secondary',
        borderBottom: '2px solid',
        borderColor: active ? 'text.primary' : 'transparent',
        '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
      }}
    >
      {label}
      {count > 0 && (
        <Box
          component="span"
          sx={{ ml: 0.5, fontFamily: MONO_FONT, fontSize: 11, fontWeight: 400, color: 'text.disabled' }}
        >
          {count}
        </Box>
      )}
    </Button>
  )
}
